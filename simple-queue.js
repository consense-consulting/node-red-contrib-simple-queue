const {v4: uuidv4} = require('uuid');

module.exports = function(RED) {
    function SimpleQueueNode(config) {
        RED.nodes.createNode(this, config);
        this.count = config.count||4;
        this.waiting = [];
        this.queue = [];
        let node = this;

        node.interval = setInterval(() => {
            node.status({
                fill: "green",
                shape: "dot",
                text: "Waiting " + node.waiting.length + " messages"
            });

            // Check queue
            while(node.queue.length < config.count) {
                const message = node.waiting.pop();
                if(!message) break; // nothing is waiting in queue

                node.queue.push(message.queue_msg_id);
                node.send(message);
            }
        }, 1000);

        node.on('input', function(msg) {
            if(msg.queue_msg_id) {
                // Message has a queue id, clear it!
                const idx = node.queue.indexOf(msg.queue_msg_id);
                //node.error("Clearing message id " + msg.queue_msg_id);
                if(idx !== -1) {
                    node.queue.splice(idx, 1);
                } else {
                    node.error("Failed to find msg id");
                }
                //node.error("Queue size: " + node.queue.length);
            } else {
                const m = RED.util.cloneMessage(msg);
                m.queue_msg_id = uuidv4();

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