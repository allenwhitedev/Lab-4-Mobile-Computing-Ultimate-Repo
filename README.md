Ultimate repository for Mobile Computing Lab 4, including node, Android, mbed, etc.

Node 
https://github.com/allenwhitedev/MobileComputingLab4MQQT-Node

Android
https://github.com/emily-macon/MobileComputingLab4Android-REST


# How to run node <-> mbed 
#1 Download mqtt_node.zip from class & run "npm install --save" followed by "npm start" wait until mongo download finishes before moving on

#2 Replace index.pug contents with contents of index.pug from repo

#3 Replace server.js

"npm start" in terminal to run standalone web app

-- to run with mbed do the following (steps #2-3 not necessary):

#4 Download K64F-RTOS-MQTT-Example by Mike Baylis by searching for programs in mbed compiler or use this link
https://developer.mbed.org/users/msbaylis/code/K64F-RTOS-MQTT-Example/

#5 Set BROKER in main.cpp equal to the value you get from running "ifconfig | grep inet | grep broadcast" and grab the value between inet and imask. It should look like this: 192.xxx.x.xxx where x are numbers.

#6 Set HOST in config.js in node app to the ip address you got from step #5 (HOST: '192.xxx.x.xxx') 

#7 SET CLIENTID to MAC address of your frdm board without the ":" separating the 6 number pairs (string should be length 12). To get your MAC address plug your mbed board into your computer and router, compile and drop the .bin from the K64F-RTOS-MQTT-Example. 

- Run "ls /dev/tty.usbmodem*" in terminal. You should get output that looks like "/dev/tty/.usbmodem14xxx" where x are numbers. 
- Type "screen /dev/tty.usbmodem14xxx", copying the output from the ls command (including path)
- Finally flash your mbed board using the reset button and you should see several print statements beginning with "Welcome to the K64F MQTT Demo" every time you do so
- Copy the value from "MAC address is "
- Paste the value in CLIENTID in main.cpp and remove every colon (:)
- To finish, compile K64-RTOS-MQTT-Example and place the .bin on MBED    

* Now you've finished configuration and are ready to run mbed & node together
#8 "npm start" the node server. Type the the node server location from the node log "Listening on:" in your browser. It should look like 192.xxx.x.xxx:8080
Open the debug log.  
#9 Press the reset button on the frdm board
#10 The terminal tab running screen should indicate successful connection with "Attempting TCP Connect", "Attempting MQTT connect", and "Subscribing to MQTT topic". 
The debug log on the web app should display "New client connected:" and "Client '83j2kd93b3k6' subscribed to"

*Notes
- Have one terminal open with screen command to display mbed and another to view node logs
- "CTRL-A" and "CTRL-D" to exit screen command from terminal
- "screen -r" to resume a screen session after exiting with above commands
- Use "sudo killall -15 mongod" to fix mongo errors when a runtime error occurs and the db is not closed
- Hitting reset on mbed after the initial connection to node will log a json object with type error to the node server since it was abruptly disconnected. This is normal.


# Running server.js with mongo

#1 Run node server with mbed board by following guide "How to run node <-> mbed" above, but first complete steps #2-4

#2 Replace my the mongoUrl to use your ip address (HOST from config.js)

#3 Run "mongo 'mongourl'" where 'mongoUrl' is your mongoUrl (do not use quotes)

#4 Now in mongo shell run "db.areas.insert({_id: "YOUR_FRDM_MAC_ADDRESS", name: "area1", location: "Study Abroad Office (Hub)"})" replacing YOUR_FRDM_MAC_ADDRESS with your frdm MAC ADDRESS (keep quotes, it's a string)

- After these 4 steps are complete pressing sw2 on the mbed board will increment the population of area1 in the mongo database. See the difference in population by running "db.areas.findOne({name: "area1"}).population" in the mongo shell before and after sw2 button press(es).

/* Server.js
 * The main portion of this project. Contains all the defined routes for express,
 * rules for the websockets, and rules for the MQTT broker.
 * Refer to the portions surrounded by --- for points of interest */
var express   = require('express'),
	app       = express();
var pug       = require('pug');
var sockets   = require('socket.io');
var path      = require('path');

var conf      = require(path.join(__dirname, 'config'));
var internals = require(path.join(__dirname, 'internals'));

// create a mongo client and connect to mongo on startup after 5s delay
MongoClient = require('mongodb').MongoClient
setTimeout(() =>
{
	let mongoUrl = 'mongodb://192.xxx.x.xxx:27017/mqtt'
	MongoClient.connect(mongoUrl, (err, db) => 
	{
		if (err)
			return console.log("ERROR :( :", err)
		
		console.log("Connection established to mongdb for mqtt")
		globalDB = db
	})
}, 5000)


// -- Setup the application
setupExpress();
setupSocket();


// -- Socket Handler
// Here is where you should handle socket/mqtt events
// The mqtt object should allow you to interface with the MQTT broker through 
// events. Refer to the documentation for more info 
// -> https://github.com/mcollina/mosca/wiki/Mosca-basic-usage
// ----------------------------------------------------------------------------
function socket_handler(socket, mqtt) {
	// Called when a client connects
	mqtt.on('clientConnected', client => {


		socket.emit('debug', {
			type: 'CLIENT', msg: 'New client connected: ' + client.id
		});
	});

	// Called when a client disconnects
	mqtt.on('clientDisconnected', client => {
		socket.emit('debug', {
			type: 'CLIENT', msg: 'Client "' + client.id + '" has disconnected'
		});
	});

	// Called when a client publishes data
	mqtt.on('published', (data, client) => {
		if (!client) return;

		data.numPresses = data.numPresses || 1

		//console.log('globalDB from socket', globalDB)

		globalDB.collection('areas').findOne({}, (err, testArea) =>
		{
			if (err)
				return err
			console.log('areas from sockets', testArea)
		})

		// each area has an id equal to the MAC address of its frdm board
		globalDB.collection('areas').update({_id: client.id}, 
			{$inc: {population: 1} }, (err, result) =>
		{
			if (err)
				return err
			console.log("increase population in", client.id)
		})

		console.log('data', data)
		console.log('data.payload', data.payload)

		socket.emit('debug', {
			type: 'PUBLISH', 
			msg: 'Client "' + client.id + '" published "' + JSON.stringify(data) + '"'
		});
	});

	// Called when a client subscribes
	mqtt.on('subscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', {
			type: 'SUBSCRIBE',
			msg: 'Client "' + client.id + '" subscribed to "' + topic + '"'
		});
	});

	// Called when a client unsubscribes
	mqtt.on('unsubscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', {
			type: 'SUBSCRIBE',
			msg: 'Client "' + client.id + '" unsubscribed from "' + topic + '"'
		});
	});
}
// ----------------------------------------------------------------------------


// Helper functions
function setupExpress() {
	app.set('view engine', 'pug'); // Set express to use pug for rendering HTML

	// Setup the 'public' folder to be statically accessable
	var publicDir = path.join(__dirname, 'public');
	app.use(express.static(publicDir));

	// Setup the paths (Insert any other needed paths here)
	// ------------------------------------------------------------------------
	// Home page
	app.get('/', (req, res) => {
		res.render('index', {title: 'MQTT Tracker'});
	});

	// Basic 404 Page
	app.use((req, res, next) => {
		var err = {
			stack: {},
			status: 404,
			message: "Error 404: Page Not Found '" + req.path + "'"
		};

		// Pass the error to the error handler below
		next(err);
	});

	// Error handler
	app.use((err, req, res, next) => {
		console.log("Error found: ", err);
		res.status(err.status || 500);

		res.render('error', {title: 'Error', error: err.message});
	});
	// ------------------------------------------------------------------------

	// Handle killing the server
	process.on('SIGINT', () => {
		internals.stop();
		process.kill(process.pid);
	});
}

function setupSocket() {
	var server = require('http').createServer(app);
	var io = sockets(server);

	// Setup the internals
	internals.start(mqtt => {
		io.on('connection', socket => {
			socket_handler(socket, mqtt)
		});
	});

	server.listen(conf.PORT, conf.HOST, () => { 
		console.log("Listening on: " + conf.HOST + ":" + conf.PORT);
	});
}




