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
