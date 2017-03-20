Lab 4

Work Completed:
We configured the node server to have bidirectional communication with the Mbed device. The Mbed button sends a count of the amount of clicks to the node server. These button clicks simulate the amount of students in each classroom. Then, once the amount of students per classroom reaches a certain threshold, an LED on the Mbed board illuminates, simulating that the classroom has reached capacity. We also created a simple Android App (with guidance from online examples) to communicate with the node server as well. The Android App also has foreground listeners to retrieve data from the 4 beacons. With all of these connections, we were able to create a system of beacons in 4 different classrooms that count how many people are in the room. With this data, we were able to create a heat map reflecting the amount of students per classroom.

What Did Not Work:
In developing the Android App, we initially attempted to use the Proximity API, however, we faced many roadblocks with incompatabilities with our beacons. We then found that using the Nearby Messages API, we were able to accomplish all of our goals and faced less issues.

Conclusion:
We faced some challenges while developing the system, but we were able to create all the connections and look forward to starting our final project!