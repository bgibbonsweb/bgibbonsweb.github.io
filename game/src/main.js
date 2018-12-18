
var mouseDown = 0;
var mouseX = [0, 0, 0, 0];
var mouseY = [0, 0, 0, 0];
var mouseXDown = [0, 0, 0, 0];
var mouseYDown = [0, 0, 0, 0];
var wheelXEvent = 0;
var wheelYEvent = 0;
var wheelXEventPrev = 0;
var wheelYEventPrev = 0;
var wheelX = 0;
var wheelY = 0;

//Create a WebGLRenderer
var mouseElement;
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( new THREE.Color(0, 0, 0), 1 );
document.body.appendChild( renderer.domElement );
mouseElement = renderer.domElement;

var levelObject = { };
showEditorObjects = false;

function doTouch(event) {
	mouseDown = event.touches.length;
	for (var i = 0; i < mouseDown && i < mouseX.length; i++)
	{
		mouseX[i] = event.touches[i].clientX;
		mouseY[i] = event.touches[i].clientY;
	}
}

mouseElement.onmousedown = function(event) { 
	if (document.activeElement == document.body)
	{
		if (mouseDown < 4)
		{
			mouseX[mouseDown] = event.clientX;
			mouseY[mouseDown] = event.clientY;

			mouseXDown[mouseDown] = event.clientX;
			mouseYDown[mouseDown] = event.clientY;
		}
		mouseDown++;
	}
}

mouseElement.onmousemove = function(event) { 
	mouseX[mouseDown - 1] = event.clientX;
	mouseY[mouseDown - 1] = event.clientY;
}

mouseElement.onmouseup = function(event) {
  mouseDown = 0;
}

mouseElement.ontouchstart = function(event) {
	mouseDown = event.touches.length;
	for (var i = 0; i < mouseDown && i < mouseX.length; i++)
	{
		mouseX[i] = event.touches[i].clientX;
		mouseY[i] = event.touches[i].clientY;

		if (i == mouseDown - 1)
		{
			mouseXDown[i] = event.touches[i].clientX;
			mouseYDown[i] = event.touches[i].clientY;
		}
	}
}

mouseElement.onwheel = function(event)
{
	wheelXEvent += event.deltaX;
	wheelYEvent += event.deltaY;
}

mouseElement.ontouchmove = doTouch;
mouseElement.ontouchend = doTouch;
mouseElement.ontouchcancel = doTouch;




// init world vars
lastTime = new Date().getTime();
currentlyPressedKeys = { };
previouslyPressedKeys = { };
previousMouseDown = 0;
firstTime = lastTime;
blockTypes = { };


var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 45000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 100, 0 );
camera.far = 100000;

var scene = new THREE.Scene();
var loader = new THREE.TextureLoader();

diskParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/part1.png")
} );
scene.add( diskParticleSystem );

particleOptions = {
	position: new THREE.Vector3(),
	positionRandomness: 0,
	velocity: new THREE.Vector3(),
	velocityRandomness: 0.0001,
	color: 0xf4c741,
	colorRandomness: 0.02,
	turbulence: .0,
	lifetime: 300,
	size: 35,
	sizeRandomness: 0,
};

var gameObjects = [];
var playerObjects = [];
var solidGameObjects = [];

function addType(name, obj)
{
	this.blockTypes[name] = obj;
	obj.type = name;
}

addType("Block", new Block());
addType("Glowy", new Glowy());
addType("Image", new Image());
addType("CameraBound", new CameraBound());
addType("ScreenParticle", new ScreenParticle());
addType("FrontFog", new FrontFog());
addType("Fog", new Fog());
addType("SpawnZone", new SpawnZone());


function killObject(newObject) 
{
	newObject.die();

	removeFromArray(newObject, gameObjects);
	removeFromArray(newObject, solidGameObjects);
	removeFromArray(newObject, playerObjects);
} 

function removeFromArray(obj, ary) 
{
	var index = ary.indexOf(obj);
	if (index > -1)
	 	ary.splice(index, 1);
}

function addGameObject(newObject) 
{
	gameObjects.push(newObject);
	return newObject;
} 

function resetObjectLists()
{
	solidGameObjects.length = 0;
	playerObjects.length = 0;

	for (var i = 0; i < gameObjects.length; i++)
	{
		var obj = gameObjects[i];
		if (obj.isSolid)
		{
			solidGameObjects.push(obj);
		}
		if (obj.isPlayer)
			playerObjects.push(obj);
	}
}

function addSolidGameObject(newObject) 
{
	addGameObject(newObject);
	newObject.isSolid = true;
	solidGameObjects.push(newObject);
	return newObject;
} 

function addPlayerObject(newObject) 
{
	addGameObject(newObject);
	playerObjects.push(newObject);
	return newObject;
} 

function findTarget(x, y, team) 
{
	var bestDistance = 1000;
	var bestTarget = null;

	for (var i = 0; i < playerObjects.length; i++) 
	{
		var obj = playerObjects[i];
		if (obj.team != team)
		{
			var distance = Math.sqrt((obj.x - x) * (obj.x - x) + (obj.y - y) * (obj.y - y));
			if (distance < bestDistance)
			{
				bestDistance = distance;
				bestTarget = obj;
			}
		}
	}

	return bestTarget;
}

function isObject(x1, x2, y1, y2, objs, z = 0, ignoreEditorObjects)
{
	ignoreEditorObjects = false;
	for (var i = 0; i < objs.length; i++) 
	{	
		var obj = objs[i];
		if (obj.x - obj.sizeX / 2 <= x2 && obj.x + obj.sizeX / 2 >= x1 && obj.y - obj.sizeY / 2 <= y2 && obj.y + obj.sizeY / 2 >= y1 && obj.z == z && (!ignoreEditorObjects || !obj.isEditorObject))
			return obj;
	}
}

var currentlyPressedKeys = {};
document.onkeydown = handleKeyDown;
document.onkeyup = handleKeyUp;

function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

var lvlEdit = new LevelEditor();

camera.position.set( 0, 0, 25);
camera.lookAt( 0, 0, 0 );

var timeNow = 0;
function animate() {

	wheelX = wheelXEvent - wheelXEventPrev;
	wheelXEventPrev = wheelXEvent;
	wheelY = wheelYEvent - wheelYEventPrev;
	wheelYEventPrev = wheelYEvent;

	requestAnimationFrame( animate );

	timeNow = new Date().getTime();
	var rot = 0;

	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;

	if (document.activeElement != document.body)
		currentlyPressedKeys = { };

	lvlEdit.update(deltaTime);
	for (var i = 0; i < gameObjects.length; i++) 
	{	
		var obj = gameObjects[i];
		obj.update(deltaTime);
	}

	diskParticleSystem.update( timeNow - firstTime );
	renderer.render( scene, camera );
	lastTime = timeNow;

	for (var key in currentlyPressedKeys)
		previouslyPressedKeys[key] = currentlyPressedKeys[key];
	previousMouseDown = mouseDown;
};

animate();


function handleKeyDown(event) {
	if (document.activeElement == document.body)
		currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

document.addEventListener( 'keydown', handleKeyDown, false );
document.addEventListener( 'keyup', handleKeyUp, false );

