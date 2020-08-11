const {v4: uuidv4} = require('uuid');

module.exports = function(RED) {
    function SimpleQueueNode(config) {
        RED.nodes.createNode(this, config);
        this.count = config.count||4;
        this.unique_check = config.unique_check||undefined;

        this.waiting = [];
        this.queue = [];
        this.unique_index = {};

        RED.events.on('runtime-event', (e) => {
            if(e.id==='project-update') {
                console.log(e);
                console.log(RED.settings.userDir);
            }
        });

        let node = this;

        node.interval = setInterval(() => {
            node.status({
                fill: "green",
                shape: "dot",
                text: "Waiting " + node.waiting.length + " messages"
            });
        }, 1000);

        function dequeueMessages() {
            // Check queue
            while(node.queue.length < config.count) {
                const message = node.waiting.pop();
                if(!message) break; // nothing is waiting in queue

                node.queue.push(message.queue_msg_id);
                node.send(message);
            }
        }

        node.on('input', function(msg) {
            if(msg.queue_msg_id) {
                // Message has a queue id, clear it!
                const idx = node.queue.indexOf(msg.queue_msg_id);
                //node.error("Clearing message id " + msg.queue_msg_id);
                if(idx !== -1) {
                    node.queue.splice(idx, 1);
                    // If we have unique check enabled remove it from the list
                    if(node.unique_check) {
                        delete node.unique_index[msg.queue_msg_id];
                    }
                    dequeueMessages();
                } else {
                    node.error("Failed to find msg id");
                }
                //node.error("Queue size: " + node.queue.length);
            } else {
                const m = RED.util.cloneMessage(msg);
                m.queue_msg_id = uuidv4();

                if(node.unique_check) {
                    // Make sure its not in our unique list
                    const key = m[node.unique_check];
                    if(!key || Object.values(node.unique_index).indexOf(key) === -1) {
                        node.unique_index[m.queue_msg_id] = key;
                    } else {
                        // Key is already in the queue or under processing, skip it
                        return;
                    }
                }

                if(node.queue.length < config.count) {
                    // Still place in queue
                    node.queue.push(m.queue_msg_id);
                    node.send(m);
                } else {
                    //node.error("Waiting for empty space in queue...");
                    node.waiting.push(m);
                }
            }
        });
        node.on('close', function() {
            node.queue = [];
            clearInterval(node.interval);
            // Clean up
        });
    }

    RED.nodes.registerType("simple-queue", SimpleQueueNode);
}