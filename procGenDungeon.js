CANVAS_WIDTH = 750; //canvas width
CANVAS_HEIGHT = 500; //canvas height
NUM_COLORS = 256; //color range for rooms

CORRIDOR_WALL_THRESHOLD = 0.333; //threshold for which side of a room the end corridor is

MAX_CONNECTIONS = 1 + Math.floor(Math.random() * 8); //maximum number of connections a room can have

MIN_ROOM_SIZE = 4 * SQUARE_SIZE; //minimum size a room can be
MAX_ROOM_ADDITION = 3 * SQUARE_SIZE; //maximum addition to min_room_width, resulting in final room size
HEIGHT_WIDTH_DIFFERENCE = 3 * SQUARE_SIZE; //largest possible difference between height and width of rooms

compEnum = { //enum for components of dungeon
    EMPTY: 0,
    ROOM: 1,
    CORRIDOR: 2,
    BLOCK: 3,
    WALL: 4,
    ENTRY: 5
};

connect = new Map(); //map of connections for rooms
minTreeMap = new Map(); //map for minimum spanning tree of rooms
allRooms = []; //array of all rooms

mapSquares = new Array(Math.round((CANVAS_WIDTH/SQUARE_SIZE)*(CANVAS_HEIGHT/SQUARE_SIZE)));
for (var i = 0; i < mapSquares.length; i++) {
    mapSquares[i] = compEnum.EMPTY;
}

function Corridor(startX, startY, endX, endY, distance) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.distance = distance;
    this.corridorSquares = [];
}

function CorridorSquare(x, y) {
    this.x = x;
    this.y = y;
    this.w = SQUARE_SIZE;
    this.h = SQUARE_SIZE;
    this.parent = null;
}

function Room(x, y, w, h, color) { //room constructor
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color;
    this.inTree = false;
    this.parent = null;
    this.corridors = [];
    this.roomSquares = [];
    this.roomWalls = [];
    this.intersect = intersect;
    this.connections = connections;
}

function RoomSquare(x, y) {
    this.x = x;
    this.y = y;
    this.w = SQUARE_SIZE;
    this.h = SQUARE_SIZE;
}

function RoomWall(x, y) {
    this.x = x;
    this.y = y;
    this.w = SQUARE_SIZE;
    this.h = SQUARE_SIZE;
}

function intersect(otherRoom) { //check room intersection
    return !(this.x + this.w + 2*SQUARE_SIZE < otherRoom.x ||
             otherRoom.x + otherRoom.w + 2*SQUARE_SIZE < this.x ||
             this.y + this.h + 2*SQUARE_SIZE < otherRoom.y ||
             otherRoom.y + otherRoom.h + 2*SQUARE_SIZE < this.y);
}

function connections() { //connect rooms to other rooms
    for (var i = 0; i < MAX_CONNECTIONS; i++) {
        var otherRoom = allRooms[Math.floor(Math.random() * allRooms.length)];
        if (this != otherRoom) {
            if (!connect.has(this)) {
                connect.set(this, []);   
            }
            if (!connect.has(otherRoom)) {
                connect.set(otherRoom, []);
            }
            var distance = Math.sqrt((this.x - otherRoom.x)*(this.x - otherRoom.x) + (this.y - otherRoom.y)*(this.y - otherRoom.y));
            var corridor = new Corridor(this.x, this.y, otherRoom.x, otherRoom.y, distance);
            this.corridors.push(corridor);
            otherRoom.corridors.push(corridor);
            connect.get(this).push(otherRoom);
            connect.get(otherRoom).push(this);
        }
    }
}

function genRandNum(multNum) { //generate a random number rounding to the nearest multiple of square_size
    return Math.round((Math.random() * multNum)) * SQUARE_SIZE;
}

function randPosNeg() { // +1 or -1
    if (Math.random() < 0.5) {
        return 1;
    } else {
        return -1;
    }
}

function genRoom() { //generate a rectangle
    if (Math.random() < 0.5) {  
        var roomW = MIN_ROOM_SIZE + genRandNum(MAX_ROOM_ADDITION/SQUARE_SIZE); //room width = min width + addition
        var roomH = roomW + randPosNeg() * genRandNum(HEIGHT_WIDTH_DIFFERENCE/SQUARE_SIZE); //room height = roomWidth +/- heightWidthDiff
    } else {
        var roomH = MIN_ROOM_SIZE + genRandNum(MAX_ROOM_ADDITION/SQUARE_SIZE); //room height = min height + addition
        var roomW = roomH + randPosNeg() * genRandNum(HEIGHT_WIDTH_DIFFERENCE/SQUARE_SIZE); //room width = roomHeight +/- heightWidthDiff
    }
    var roomX = genRandNum((CANVAS_WIDTH - (roomW + HEIGHT_WIDTH_DIFFERENCE))/SQUARE_SIZE);
    if (roomX < HEIGHT_WIDTH_DIFFERENCE) {
        roomX += (HEIGHT_WIDTH_DIFFERENCE - roomX);
    }
    var roomY = genRandNum((CANVAS_HEIGHT - (roomH + HEIGHT_WIDTH_DIFFERENCE))/SQUARE_SIZE);
    if (roomY < HEIGHT_WIDTH_DIFFERENCE) {
        roomY += (HEIGHT_WIDTH_DIFFERENCE - roomY);
    }
    var roomColor = "rgb(" + genRandNum(NUM_COLORS/SQUARE_SIZE) + "," + genRandNum(NUM_COLORS/SQUARE_SIZE) + "," + genRandNum(NUM_COLORS/SQUARE_SIZE) + ")";
    var room = new Room(roomX, roomY, roomW, roomH, roomColor);
    for (var i = 0; i < roomW/SQUARE_SIZE; i++) {
        for (var j = 0; j < roomH/SQUARE_SIZE; j++) {
            room.roomSquares.push(new RoomSquare(roomX + i * SQUARE_SIZE, roomY + j * SQUARE_SIZE));
        }
    }
    return room;
}

function genViableRooms() {
    var noIntersect = true;
    var i = 0;
    while (i < ROOM_TRIES || allRooms.length < 2) { //attempt to create room_tries number of rooms
        var room = genRoom();
        for (var j = 0; j < allRooms.length; j++) { //check for intersection
            if (allRooms[j].intersect(room)) {
                noIntersect = false;
                break;
            }
        }
        if (noIntersect) {
            allRooms.push(room); //push room into array
        }
        noIntersect = true;
        i++;
    }
    
    for (var i = 0; i < allRooms.length; i++) { //connect rooms to each other
        allRooms[i].connections();
    }
}

function minTree() { //create a minimum spanning tree
    var startIndex = Math.floor(Math.random() * connect.size);
    var currentRoom = allRooms[startIndex];
    currentRoom.inTree = true;
    minTreeMap.set(currentRoom, []);
    var currentRoomConnections = connect.get(currentRoom); //rooms connected to currentRoom
    var count = 1;
    while (count != connect.size) { //while there are still rooms not in the tree
        
        var minDist = Number.POSITIVE_INFINITY;
        var minRoom = null;
        var minIndex = 0;
        if (currentRoomConnections == undefined) {
            return false;
        }
        
        for (var k = 0; k < currentRoom.roomSquares.length; k++) { //put roomsquares into mapsquares
            mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * currentRoom.roomSquares[k].x/SQUARE_SIZE + currentRoom.roomSquares[k].y/SQUARE_SIZE] = compEnum.ROOM;
        }
        for (var k = 0; k < currentRoom.roomWalls.length; k++) {
            mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * currentRoom.roomWalls[k].x/SQUARE_SIZE + currentRoom.roomWalls[k].y/SQUARE_SIZE] = compEnum.WALL;
        }
        
        for (var i = 0; i < currentRoomConnections.length; i++) { //find minimum dist to rectangle not in tree
            var corrDist = currentRoom.corridors[i].distance;
            if (currentRoomConnections[i].inTree == false && corrDist < minDist) {
                minDist = corrDist;
                minRoom = currentRoomConnections[i];
                minIndex = i;
            }
        }
        
        if (minDist != Number.POSITIVE_INFINITY) {
            minRoom.parent = currentRoom;
            minRoom.inTree = true;
            minTreeMap.get(currentRoom).push(minRoom);
            minTreeMap.set(minRoom, []);
            currentRoom = minRoom; //next room
            currentRoomConnections = connect.get(currentRoom); //next room connections
            count++;
        } else { //no connections can be made from current room, go to parent
            currentRoom = currentRoom.parent;
            currentRoomConnections = connect.get(currentRoom);
        }
    }
    return true;
}

function generateCorridors() {
    for (var key of minTreeMap.keys()) { //for each room
        for (var i = 0; i < minTreeMap.get(key).length; i++) { //make corridors for each connection
          
            var endRand = Math.random(); //random number to determine which side of room corridor will end on
            if (endRand < CORRIDOR_WALL_THRESHOLD) { //then end on bottom of room
                key.corridors[i].endX = minTreeMap.get(key)[i].x + Math.round((Math.random() * minTreeMap.get(key)[i].w)/SQUARE_SIZE) * SQUARE_SIZE;
                key.corridors[i].endY = minTreeMap.get(key)[i].y + minTreeMap.get(key)[i].h;
            } else if (endRand < 2 * CORRIDOR_WALL_THRESHOLD) { //then end on top of room
                key.corridors[i].endX = minTreeMap.get(key)[i].x + Math.round((Math.random() * minTreeMap.get(key)[i].w)/SQUARE_SIZE) * SQUARE_SIZE;
                key.corridors[i].endY = minTreeMap.get(key)[i].y - SQUARE_SIZE;
            } else { //then end on left/right of room
                if (key.corridors[i].endX > key.corridors[i].startX) { //end is right of start -- end on left of room
                    key.corridors[i].endX = minTreeMap.get(key)[i].x - SQUARE_SIZE;
                    key.corridors[i].endY = minTreeMap.get(key)[i].y + Math.round((Math.random() * minTreeMap.get(key)[i].h)/SQUARE_SIZE) * SQUARE_SIZE;
                } else { //then end is on left of start -- end on right of room
                    key.corridors[i].endX = minTreeMap.get(key)[i].x + minTreeMap.get(key)[i].w;
                    key.corridors[i].endY = minTreeMap.get(key)[i].y + Math.round((Math.random() * minTreeMap.get(key)[i].h)/SQUARE_SIZE) * SQUARE_SIZE;
                }
            }
            
            var roomStartX = key.x;
            var roomStartY = key.y;
            var roomStartW = key.w;
            var roomStartH = key.h;
            
            var roomEndX = minTreeMap.get(key)[i].x;
            var roomEndY = minTreeMap.get(key)[i].y;
            var roomEndW = minTreeMap.get(key)[i].w;
            var roomEndH = minTreeMap.get(key)[i].h;
                        
            var currentX = Math.round(((roomStartX + roomStartX + roomStartW)/2)/SQUARE_SIZE) * SQUARE_SIZE;
            var currentY = Math.round(((roomStartY + roomStartY + roomStartH)/2)/SQUARE_SIZE) * SQUARE_SIZE;
            var prevAdded = false;
            while ((currentX < (roomEndX - SQUARE_SIZE) || currentX > (roomEndX + roomEndW)) ||
                   (currentY < (roomEndY - SQUARE_SIZE) || currentY > (roomEndY + roomEndH))) {
                var originalX = currentX;
                var originalY = currentY;
                var directionX;
                var directionY;

                //set correct direction for x to move in going towards end x coordinate
                if (currentX < key.corridors[i].endX) {
                    directionX = 1;
                } else if (currentX > key.corridors[i].endX) {
                    directionX = -1;
                } else {
                    directionX = 0;
                }
                //set correct direction for y to move in going towards end y coordinate
                if (currentY < key.corridors[i].endY) {
                    directionY = 1;
                } else if (currentY > key.corridors[i].endY) {
                    directionY = -1;
                } else {
                    directionY = 0;
                }
                
                
                if (directionX != 0 && directionY != 0) { //if not in line with end coordinates
                  
                    if (Math.random() < 0.5) { //50% chance to move in x direction
                        currentX += directionX * SQUARE_SIZE; //correct x direction
                    } else { //50% chance to move in y direction
                        currentY += directionY * SQUARE_SIZE; //correct y direction
                    }
                    
                } else if (directionX == 0) { //in line with final x coordinate
                  
                    currentY += directionY * SQUARE_SIZE; //move in correct y direction
                        
                } else { //in line with final y coordinate
                  
                    currentX += directionX * SQUARE_SIZE; //move in correct x direction
                }
                
                //start room corner cases
                if ((currentX == (roomStartX - SQUARE_SIZE) && currentY == (roomStartY - SQUARE_SIZE)) ||
                    (currentX == (roomStartX - SQUARE_SIZE) && currentY == (roomStartY + roomStartH)) ||
                    (currentX == (roomStartX + roomStartW) && currentY == (roomStartY - SQUARE_SIZE)) ||
                    (currentX == (roomStartX + roomStartW) && currentY == (roomStartY + roomStartH))) {
                    
                    if ((currentX - originalX) == 0) {
                        currentY = originalY;
                        if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (currentX + SQUARE_SIZE)/SQUARE_SIZE + currentY/SQUARE_SIZE] != compEnum.ROOM) {
                            currentX += SQUARE_SIZE;
                        } else {
                            currentX -= SQUARE_SIZE;
                        }
                    } else {
                        currentX = originalX;
                        if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * currentX/SQUARE_SIZE + (currentY + SQUARE_SIZE)/SQUARE_SIZE] != compEnum.ROOM) {
                            currentY += SQUARE_SIZE;
                        } else {
                            currentY -= SQUARE_SIZE;
                        }
                    }
                }
                
                //end room corner cases
                if ((currentX == (roomEndX - SQUARE_SIZE) && currentY == (roomEndY - SQUARE_SIZE)) ||
                    (currentX == (roomEndX - SQUARE_SIZE) && currentY == (roomEndY + roomEndH)) ||
                    (currentX == (roomEndX + roomEndW) && currentY == (roomEndY - SQUARE_SIZE)) ||
                    (currentX == (roomEndX + roomEndW) && currentY == (roomEndY + roomEndH))) {

                    if ((currentX - originalX) == 0) {
                        currentY  = originalY;
                        if (roomEndX > currentX) {
                            currentX += SQUARE_SIZE;
                        } else {
                            currentX -= SQUARE_SIZE;
                        }
                    } else {
                        currentX = originalX;
                        if (roomEndY > currentY) {
                            currentY += SQUARE_SIZE;
                        } else {
                            currentY -= SQUARE_SIZE;
                        }
                    }
                }
                if (prevAdded) {
                    //code
                
                if (currentX >= (roomStartX - SQUARE_SIZE) && currentX <= (roomStartX + roomStartW) &&
                    currentY >= (roomStartY - SQUARE_SIZE) && currentY <= (roomStartY + roomStartH)) {
                    
                    if (currentX != originalX && currentY != originalY &&
                        originalX >= (roomStartX - SQUARE_SIZE) && originalX <= (roomStartX + roomStartW) &&
                        originalY >= (roomStartY - SQUARE_SIZE) && originalY <= (roomStartY + roomStartH)) {
                        var popped = key.corridors[i].corridorSquares.pop();
                        mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * popped.x/SQUARE_SIZE + popped.y/SQUARE_SIZE] = compEnum.EMPTY;

                    }
                }
                }
                
                //generated a corridor
                if (currentX < CANVAS_WIDTH && currentX >= 0 && currentY < CANVAS_HEIGHT && currentY >= 0) { //if within map boundaries
                    if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * currentX/SQUARE_SIZE + currentY/SQUARE_SIZE] != compEnum.ROOM) { //if not room square
                        key.corridors[i].corridorSquares.push(new CorridorSquare(currentX, currentY)); //add to list of corridor squares
                        mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * currentX/SQUARE_SIZE + currentY/SQUARE_SIZE] = compEnum.CORRIDOR;
                        prevAdded = true;
                    }
                } else { //reset and randomly pick a new corridor square
                    currentX = originalX;
                    currentY = originalY;
                    prevAdded = false;
                }
            }
        }
    }
}

function generateWalls() {
    for (var room of minTreeMap.keys()) {
        if (room.x - SQUARE_SIZE >= 0) { //left walls
            for (var i = 0; i < room.h/SQUARE_SIZE; i++) {
                if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] != compEnum.CORRIDOR) {
                    room.roomWalls.push(new RoomWall(room.x - SQUARE_SIZE, room.y + i * SQUARE_SIZE));
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] = compEnum.WALL;
                } else {
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] = compEnum.ENTRY;
                }
            }
            if (room.y - SQUARE_SIZE >= 0 &&
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] != compEnum.CORRIDOR) { //top left corner wall
                room.roomWalls.push(new RoomWall(room.x - SQUARE_SIZE, room.y - SQUARE_SIZE));
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.WALL;
            } else if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] == compEnum.CORRIDOR) {
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.ENTRY;
            }
        }
        if (room.y - SQUARE_SIZE >= 0) { //top walls
            for (var i = 0; i < room.w/SQUARE_SIZE; i++) {
                if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] != compEnum.CORRIDOR) {
                    room.roomWalls.push(new RoomWall(room.x + i * SQUARE_SIZE, room.y - SQUARE_SIZE));
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.WALL;
                } else {
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.ENTRY;
                }
            }
            if (room.x + SQUARE_SIZE >= 0 &&
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] != compEnum.CORRIDOR) { //top right corner wall
                room.roomWalls.push(new RoomWall(room.x + room.w, room.y - SQUARE_SIZE));
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.WALL;
            } else if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] == compEnum.CORRIDOR) {
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y - SQUARE_SIZE)/SQUARE_SIZE] = compEnum.ENTRY;
            }
        }
        if (room.x + SQUARE_SIZE <= CANVAS_WIDTH) { //right walls
            for (var i = 0; i < room.h/SQUARE_SIZE; i++) {
                if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] != compEnum.CORRIDOR) {
                    room.roomWalls.push(new RoomWall(room.x + room.w, room.y + i * SQUARE_SIZE));
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] = compEnum.WALL;
                } else {
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + i * SQUARE_SIZE)/SQUARE_SIZE] = compEnum.ENTRY;
                }
            }
            if (room.y + SQUARE_SIZE >= 0 &&
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] != compEnum.CORRIDOR) { //bottom right corner wall
                room.roomWalls.push(new RoomWall(room.x + room.w, room.y + room.h));
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.WALL;
            } else if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] == compEnum.CORRIDOR) {
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + room.w)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.ENTRY;
            }
        }
        if (room.y + SQUARE_SIZE <= CANVAS_HEIGHT) { //bottom walls
            for (var i = 0; i < room.w/SQUARE_SIZE; i++) {
                if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] != compEnum.CORRIDOR) {
                    room.roomWalls.push(new RoomWall(room.x + i * SQUARE_SIZE, room.y + room.h));
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.WALL;
                } else {
                    mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x + i * SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.ENTRY;
                }
            }
            if (room.x - SQUARE_SIZE >= 0 &&
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] != compEnum.CORRIDOR) { //bottom left corner wall
                room.roomWalls.push(new RoomWall(room.x - SQUARE_SIZE, room.y + room.h));
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.WALL;
            } else if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] == compEnum.CORRIDOR) {
                mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * (room.x - SQUARE_SIZE)/SQUARE_SIZE + (room.y + room.h)/SQUARE_SIZE] = compEnum.ENTRY;
            }
        }
    }
}

function clearCanvas() { //clear canvas so it a new dungeon can be drawn
    var canvas = document.getElementById("dungeon");
    if (canvas.getContext) {
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        connect.clear(); 
        minTreeMap.clear();
        allRooms = [];
        
        MAX_CONNECTIONS = 1 + Math.floor(Math.random() * 8); //maximum number of connections a room can have
        
        mapSquares = new Array(Math.round((CANVAS_WIDTH/SQUARE_SIZE)*(CANVAS_HEIGHT/SQUARE_SIZE)));
        for (var i = 0; i < mapSquares.length; i++) {
            mapSquares[i] = compEnum.EMPTY;
        }
    }
}

function draw() { //draw the dungeon
    var canvas = document.getElementById("dungeon");
    if (canvas.getContext) {
        var ctx = canvas.getContext("2d");

        genViableRooms(); //generate rooms and room connections
        var correctTree = minTree(); //create minimum spanning tree
        while (!correctTree) {
            connect.clear(); 
        minTreeMap.clear();
        allRooms = [];
        
        MAX_CONNECTIONS = 1 + Math.floor(Math.random() * 8); //maximum number of connections a room can have
        
        mapSquares = new Array(Math.round((CANVAS_WIDTH/SQUARE_SIZE)*(CANVAS_HEIGHT/SQUARE_SIZE)));
        for (var i = 0; i < mapSquares.length; i++) {
            mapSquares[i] = compEnum.EMPTY;
        }
            genViableRooms();
            correctTree = minTree();
        }
        generateCorridors(); //generate corridors for each connection
        generateWalls(); //generate walls for each room
        
        for (var key of minTreeMap.keys()) {
            ctx.fillStyle = key.color;
            ctx.fillRect(key.x, key.y, key.w, key.h);
            for (var i = 0; i < key.roomSquares.length; i++) {
                ctx.strokeRect(key.roomSquares[i].x, key.roomSquares[i].y, key.roomSquares[i].w, key.roomSquares[i].h);
            }
            for (var i = 0; i < key.roomWalls.length; i++) {
                ctx.strokeRect(key.roomWalls[i].x, key.roomWalls[i].y, key.roomWalls[i].w, key.roomWalls[i].h);
            }
            for (var i = 0; i < minTreeMap.get(key).length; i++) {
                for (var j = 0; j < key.corridors[i].corridorSquares.length; j++) {
                    
                    //draw entryways
                    if (mapSquares[(CANVAS_WIDTH/SQUARE_SIZE) * key.corridors[i].corridorSquares[j].x/SQUARE_SIZE + key.corridors[i].corridorSquares[j].y/SQUARE_SIZE] == compEnum.ENTRY) {
                        ctx.fillStyle = "black";
                        ctx.fillRect(key.corridors[i].corridorSquares[j].x + 2,
                                 key.corridors[i].corridorSquares[j].y + 2,
                                 key.corridors[i].corridorSquares[j].w - 4,
                                 key.corridors[i].corridorSquares[j].h - 4);
                        
                        ctx.strokeRect(key.corridors[i].corridorSquares[j].x,
                                 key.corridors[i].corridorSquares[j].y,
                                 key.corridors[i].corridorSquares[j].w,
                                 key.corridors[i].corridorSquares[j].h);
                        
                    } else { //draw corridors
                        ctx.fillStyle = "gray";
                        ctx.fillRect(key.corridors[i].corridorSquares[j].x,
                                     key.corridors[i].corridorSquares[j].y,
                                     key.corridors[i].corridorSquares[j].w,
                                     key.corridors[i].corridorSquares[j].h);
                        
                        ctx.strokeRect(key.corridors[i].corridorSquares[j].x,
                                     key.corridors[i].corridorSquares[j].y,
                                     key.corridors[i].corridorSquares[j].w,
                                     key.corridors[i].corridorSquares[j].h);
                    }
                }
            }
        }
    }
}