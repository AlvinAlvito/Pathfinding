import PathfindingAlgorithm from "./PathfindingAlgorithm";

class Dijkstra extends PathfindingAlgorithm {
    constructor() {
        super();
        this.openList = [];
    }

    start(startNode, endNode) {
        super.start(startNode, endNode);
        this.openList = [startNode];
        startNode.distanceFromStart = 0;
    }

    nextStep() {
        if (this.openList.length === 0) {
            this.finished = true;
            return [];
        }

        const updatedNodes = [];

        // ✅ Pilih node dengan jarak terpendek dari openList
        let minIndex = 0;
        for (let i = 1; i < this.openList.length; i++) {
            if (this.openList[i].distanceFromStart < this.openList[minIndex].distanceFromStart) {
                minIndex = i;
            }
        }
        const currentNode = this.openList.splice(minIndex, 1)[0];

        currentNode.visited = true;
        currentNode.processed = true;

        const refEdge = currentNode.edges.find(e => e.getOtherNode(currentNode) === currentNode.referer);
        if(refEdge) refEdge.visited = true;

        // Cek apakah sudah sampai tujuan
        if (currentNode.id === this.endNode.id) {
            this.openList = [];
            this.finished = true;
            return [currentNode];
        }

        for (const n of currentNode.neighbors) {
            const neighbor = n.node;
            const edge = n.edge;

            // Inisialisasi jarak jika belum ada
            if (neighbor.distanceFromStart === undefined) {
                neighbor.distanceFromStart = Infinity;
            }

            if (neighbor.visited && !edge.visited) {
                edge.visited = true;
                neighbor.referer = currentNode;
                updatedNodes.push(neighbor);
            }

            if (neighbor.visited) continue;

            const neighborCurrentCost = currentNode.distanceFromStart + edge.weight;

            if (this.openList.includes(neighbor)) {
                if (neighborCurrentCost >= neighbor.distanceFromStart) {
                    continue;
                }
            } else {
                this.openList.push(neighbor);
            }

            neighbor.distanceFromStart = neighborCurrentCost;
            neighbor.parent = currentNode;
            neighbor.referer = currentNode;
        }

        return [...updatedNodes, currentNode];
    }
}

export default Dijkstra;
