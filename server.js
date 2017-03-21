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
	let mongoUrl = 'mongodb://192.168.1.140:27017/mqtt'
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


		// called repeatedly to check if population threshold is exceeded every 10s
		setInterval(() =>
		{
			globalDB.collection('areas').findOne({_id: client.id}, (err, doc) =>
			{
				if (err)
					return console.log(err)
								
				let thresholdBroken = "false"
				if (doc.population > 10)
					thresholdBroken = "true"

				let message = 
				{
						topic: "isThresholdExceeded",
						payload: thresholdBroken,
						qos: 0, 
						retain: false 
				}	

				mqtt.publish(message, () => 
				{
					console.log('attempt of publication isThresholdExceeded')
				})

			})
		}, 10000)


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

		let changeInPopulation = 0
		if ( data.topic === "increment" )
			changeInPopulation = 1
		else if ( data.topic === "decrement" )
			changeInPopulation = -1
		else
			return console.log('Invalid topic value:', data.topic)
		
		// each area has an id equal to the MAC address of its frdm board
		globalDB.collection('areas').update({_id: client.id}, 
			{$inc: {population: changeInPopulation} }, (err, result) =>
		{
			if (err)
				return console.log(err)
			console.log(data.topic + " population in", client.id)

			// right after update check if threshold has been exceeded
			globalDB.collection('areas').findOne({_id: client.id}, (err, result) =>
			{
				if (err)
					return console.log(err)

				console.log('population:', result.population)
				if (result.population > 10)
				{
					console.log('population exceeded threshold of 10, turn on led')

					if (result.population > 10)
						isThresholdBroken = "true"
					else
						isThresholdBroken = "false"

					let message = 
					{
 						topic: "isThresholdExceeded",
 						payload: isThresholdBroken,
 						qos: 0, 
 						retain: false 
					}	

					mqtt.publish(message, () => 
					{
						console.log('attempt of publication isThresholdExceeded')
					})
				}
			})
		})



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

	app.get('/test', (req, res) =>
	{
		console.log('test REST route')
		res.send("Test was successful!")
	})

	// ----------------------- ANDROID REST API 
	// android increments population of an area
	app.post('/inc/:areaId', (req, res) =>
	{
		let areaId = req.params.areaId
		globalDB.collection('areas').update({_id: req.params.areaId}, 
			{$inc: {population: 1} }, (err, result) =>
		{
			if (err)
				console.log(err)
			res.status(200).send(result)
		})
	})

	// android decrements population of an area
	app.post('/dec/:areaId', (req, res) =>
	{
		let areaId = req.params.areaId
		globalDB.collection('areas').update({_id: req.params.areaId}, 
			{$inc: {population: -1} }, (err, result) =>
		{
			if (err)
				console.log(err)
			res.status(200).send(result)
		})
	})
	// ----------------------- end Android REST API

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





