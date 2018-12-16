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

var testMode = false;
var lastTime = new Date().getTime();
var firstTime = lastTime;
var currentlyPressedKeys = { };

//Create a WebGLRenderer and turn on shadows in the renderer
var renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( new THREE.Color(0.1, 0.06, 0.12), 1 );
document.body.appendChild( renderer.domElement );
mouseElement = renderer.domElement;

function doTouch(event) {
	mouseDown = event.touches.length;
	for (var i = 0; i < mouseDown && i < mouseX.length; i++)
	{
		mouseX[i] = event.touches[i].clientX;
		mouseY[i] = event.touches[i].clientY;
	}

    event.preventDefault();
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

    event.preventDefault();
}

mouseElement.onwheel = function(event)
{
	wheelXEvent += event.deltaX;
	wheelYEvent += event.deltaY;

    event.preventDefault();
}

mouseElement.ontouchmove = doTouch;
mouseElement.ontouchend = doTouch;
mouseElement.ontouchcancel = doTouch;



var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 450000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 100, 0 );
camera.far = 100000;

var allUniforms = [];

var allShips = [];
var objects = [];

var scene = new THREE.Scene();

var loader = new THREE.TextureLoader();

cloudParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/part1.png")
} );
scene.add( cloudParticleSystem );

ringParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/part2.png")
} );
scene.add( ringParticleSystem );

shieldParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/part3.png")
} );
scene.add( shieldParticleSystem );


{
	//Create a PointLight and turn on shadows for the light
	var light = new THREE.PointLight( 0x799cfc, 3, 30000 );
	light.shadow.camera.far = 2000;
	light.position.set( 0, -6000, 0 );
	// light.castShadow = true;
	light.shadow.bias = -0.0008;
	scene.add( light );
}

	scene.add( new THREE.AmbientLight(0x222222) );

var grid2Tex = loader.load( "tex/grid2.jpg" );

grid2Tex.wrapS = THREE.RepeatWrapping;
grid2Tex.wrapT = THREE.RepeatWrapping;
grid2Tex.repeat.set( 100, 100 );

var roadTex = loader.load( "tex/road.jpg" );
roadTex.wrapS = THREE.RepeatWrapping;
roadTex.wrapT = THREE.RepeatWrapping;
roadTex.repeat.set( 20, 1 );

var tex = "star1.jpg"
var texy = "stary.jpg"
var texy2 = "stary2.jpg"
var urls = [ "tex/" + tex, "tex/" + tex, "tex/" + texy2, "tex/" + texy, "tex/" + tex, "tex/" + tex ];
var textureCube = THREE.ImageUtils.loadTextureCube( urls );
scene.background = textureCube;


var geometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);

var mat = new THREE.MeshPhongMaterial( {
	envMap: 		textureCube,
	emissiveMap: 		loader.load("tex/grid.jpg"),
	emissive: 		0xffffff,
	bumpMap: 		loader.load("tex/grid.jpg"),
	transparent: 	true,
	side: 			THREE.DoubleSide,
		reflectivity:   1.2,
		specular:  		0xffffff,
		wireframe: 		false,
		bumpScale:  	60,
});

mat.transparent = true;
mat.depthWrite = false;
mat.DoubleSide = true;
mat.blending = THREE.AdditiveBlending;

{
	var body = new THREE.Mesh( geometry, mat );
	body.rotation.x = -Math.PI / 2;
	body.position.y = -1000;
	scene.add(body);
}
{
	var body = new THREE.Mesh( geometry, mat );
	body.rotation.x = -Math.PI / 2;
	body.position.y = -1200;
	scene.add(body);
}
{
	var geometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);

	var newUniforms = {
		uvMult:     { type: "v3", value: new THREE.Vector2(2, 2) },
		texture:    { type: "t", value: grid2Tex },
		globalTime:	{ type: "f", value: 1000 * Math.random() },
	};

	allUniforms.push(newUniforms);
	var mat = new THREE.ShaderMaterial( {
		uniforms: 		newUniforms,
		vertexShader:   document.getElementById( 'gridvert' ).textContent,
		fragmentShader: document.getElementById( 'gridfrag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	mat.transparent = true;
	mat.depthWrite = false;
	mat.DoubleSide = true;
	mat.blending = THREE.AdditiveBlending;

	var body = new THREE.Mesh( geometry, mat );
	body.rotation.x = Math.PI / 2;
	body.position.y = -1100;
	scene.add(body);

}
{
	var newUniforms = {
		uvMult:     { type: "v3", value: new THREE.Vector2(5, 0.25) },
		texture:    { type: "t", value: grid2Tex },
		globalTime:	{ type: "f", value: 1000 * Math.random() },
	};

	allUniforms.push(newUniforms);
	var mat = new THREE.ShaderMaterial( {
		uniforms: 		newUniforms,
		vertexShader:   document.getElementById( 'gridvert' ).textContent,
		fragmentShader: document.getElementById( 'backfrag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	var geometry = new THREE.CylinderGeometry(10000, 10000, 2500, 48, 1, true);
	var body = new THREE.Mesh( geometry, mat );
	scene.add(body);

	var body = new THREE.Mesh( geometry, mat );
	body.position.y = 5000;
	scene.add(body);

	var body = new THREE.Mesh( geometry, mat );
	body.position.y = 10000;
	scene.add(body);
}

{
	var geometry = new THREE.Geometry();

	var ringGeometry = new THREE.CylinderGeometry(10000, 10000, 100, 48, 1, true);
	var ringMesh = new THREE.Mesh(ringGeometry);


	for (var y = -45000; y < 45000; y += 10000)
	{
		ringMesh.position.y = y;
		THREE.GeometryUtils.merge(geometry, ringMesh);
	}

	var body = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({color: 0xffffff,

		wireframe: 		false,
		side: 			THREE.DoubleSide,
	}) );
	scene.add(body);
}


var whiteMaterial = new THREE.MeshPhongMaterial( {
	color: 			0xffffff,
	side: 			THREE.DoubleSide,
});

var camZoom = 600000;
var camLook = 700000;
if (testMode)
	camZoom = 0;

var targetCamHeight = 5;
var targetCamRot = Math.PI * 0.85;
var camHeight = camZoom;
var camRot = targetCamRot;
var movingCamDist = 3000;

var camX = 0;
var camY = 0;
var camZ = 0;

options = {
	position: new THREE.Vector3(),
	positionRandomness: 0.5,
	velocity: new THREE.Vector3(),
	velocityRandomness: 0.1,
	color: 0xffffff,
	colorRandomness: 0.02,
	turbulence: .0,
	lifetime: 100,
	size: 20,
	sizeRandomness: 0,
};


function animate() {

	wheelX = wheelXEvent - wheelXEventPrev;
	wheelXEventPrev = wheelXEvent;
	wheelY = wheelYEvent - wheelYEventPrev;
	wheelYEventPrev = wheelYEvent;

	var mouseDx = mouseXDown[0] - mouseX[0];
	mouseXDown[0] = mouseX[0];
	var mouseDy = mouseYDown[0] - mouseY[0];
	mouseYDown[0] = mouseY[0];

	mouseDx += wheelX * 0.25;
	mouseDy += wheelY * 0.25;


	requestAnimationFrame( animate );

	var timeNow = new Date().getTime();
	var rot = camRot;

	var camMult = 1.4;
	camera.position.set( camX * camMult + (100 + movingCamDist) * Math.cos(rot), camY+camHeight, camZ * camMult +(100 + movingCamDist) * Math.sin(rot));
	camera.lookAt( camX * camMult , camY, camZ * camMult );

	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;
	targetCamRot += 0.0002 * deltaTime;

	for (var i = 0; i < allUniforms.length; i++)
		allUniforms[i].globalTime.value += deltaTime * 0.003;

	if (currentlyPressedKeys[87] || currentlyPressedKeys[38])
	{
		targetCamHeight += 0.3 * deltaTime;
	}
	if (currentlyPressedKeys[83] || currentlyPressedKeys[40])
	{
		targetCamHeight -= 0.3 * deltaTime;
	}
	targetCamHeight += mouseDy * 0.25;

	targetCamRot += mouseDx * 0.002;
	if (currentlyPressedKeys[68] || currentlyPressedKeys[39])
	{
		targetCamRot -= 0.003 * deltaTime;
	}
	if (currentlyPressedKeys[65] || currentlyPressedKeys[37])
	{
		targetCamRot += 0.003 * deltaTime;
	}

	camLook *= 0.998;
	camLook -= 25 * deltaTime;
	if (camLook < 0)
		camLook = 0;

	camZoom *= 0.9985;
	camZoom -= 20 * deltaTime;
	if (camZoom < 0)
		camZoom = 0;
	else
		targetCamRot += 0.0002 * deltaTime;


	movingCamDist *= 0.99;

	targetCamHeight += (5 - targetCamHeight) * 0.01;
	camHeight += (camZoom + targetCamHeight - camHeight) * 0.1;
	camRot += (targetCamRot - camRot) * 0.1;

	var border = 1000;
	var x = 0;
	var y = 100;
	var z = 0;
	var c = 1;
	for (var i = 0; i < objects.length; i++)
	{
		var obj = objects[i];
		if (obj.team == 0 && obj.life > 0 && obj.warp <= 0)
		{
			x += obj.x;
			y += obj.y;
			z += obj.z;
			c++;
		}

		obj.update(deltaTime);
	}
	if (c > 0)
	{
		camX += (x / c - camX) * 0.01;
		camY += (y / c - camY) * 0.01;
		camZ += (z / c - camZ) * 0.01;

		if (camY < 0)
			camY = 0;
	}


	renderer.render( scene, camera );
	lastTime = timeNow;

	cloudParticleSystem.update( timeNow - firstTime );
	ringParticleSystem.update( timeNow - firstTime );
	shieldParticleSystem.update( timeNow - firstTime );
};

animate();


function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

document.addEventListener( 'keydown', handleKeyDown, false );
document.addEventListener( 'keyup', handleKeyUp, false );

function Missle (x, y, z, target, color) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.xSpeed = 5 - Math.random() * 10;
	this.ySpeed = 5 - Math.random() * 10;
	this.zSpeed = 5 - Math.random() * 10;
	this.dragTime = 0;
	this.target = target;
	this.lifeTime = 0;
	this.color = color;

	this.speedMult = 0.005 + 0.03 * Math.random(); 
	this.size = 10 + Math.random() * 30;
	this.offsetX = (target.size - target.size * 2 * Math.random()) * 10;
	this.offsetY = (target.size - target.size * 2 * Math.random()) * 10;
	this.offsetZ = (target.size - target.size * 2 * Math.random()) * 10;
}

Missle.prototype.update = function(dTime) {

	var drag = 0.99;

	this.lifeTime += dTime;

	var dx = this.target.x + this.offsetX - this.x;
	var dy = this.target.y + this.offsetY - this.y;
	var dz = this.target.z + this.offsetZ - this.z;

	var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (len < 20)
	{
		var i = objects.indexOf(this);
		if (i != -1)
			objects.splice(i, 1);
		// scene.remove(this.sprite);


		options.position.x = this.x;
		options.position.y = this.y;
		options.position.z = this.z;
		options.size = 200 ;
		options.lifetime = 1000;
		options.color = 0xf4c141;
		options.velocityRandomness = 0;

		cloudParticleSystem.spawnParticle( options );

		options.color = this.color;
		options.size = 100;
		cloudParticleSystem.spawnParticle( options );

		options.size = 20;
		ringParticleSystem.spawnParticle( options );

		for (var i =  0; i < 2; i++)
		{

			options.position.x = this.x;
			options.position.y = this.y;
			options.position.z = this.z;

			options.size = 10;
			options.lifetime = 10000;
			options.color = 0xffffff;
			options.velocityRandomness = 0.05;
			cloudParticleSystem.spawnParticle( options );
			options.velocityRandomness = 0;

		}

		this.target.damage(10, this.xSpeed, this.zSpeed);

		if (this.target.life > 300)
		{
			options.position.x = this.x;
			options.position.y = this.y;
			options.position.z = this.z;
			options.size = 200 * this.target.size;
			options.lifetime = 1000;
			options.color = 0x4286f4;
			options.velocityRandomness = 0;

			cloudParticleSystem.spawnParticle( options );

			options.lifetime = 100;
			for (var i = 0; i< 2; i++)
				shieldParticleSystem.spawnParticle( options );
		}

		return;
	}

	dTime *= this.speedMult;
	var speed = dTime / len;

	this.xSpeed += dx * speed;
	this.ySpeed += dy * speed;
	this.zSpeed += dz * speed;

	if (this.lifeTime > 300)
	{
		var speedLen = Math.sqrt(this.xSpeed * this.xSpeed + this.ySpeed * this.ySpeed + this.zSpeed * this.zSpeed) + dTime;
		this.xSpeed = dx / len * speedLen;
		this.ySpeed = dy / len * speedLen;
		this.zSpeed = dz / len * speedLen;
	}

	this.x += this.xSpeed * dTime;
	this.y += this.ySpeed * dTime;
	this.z += this.zSpeed * dTime;

	//this.sprite.position.set(this.x, this.y, this.z);

	options.size = this.size;
	options.lifetime = 200;
	options.color = this.color;
	options.velocityRandomness = 0;

	options.position.x = this.x;
	options.position.y = this.y;
	options.position.z = this.z;

	cloudParticleSystem.spawnParticle( options );

	if (Math.random() > 0.97)
		ringParticleSystem.spawnParticle( options );

	for (var i = 0; i < 1; i += 0.1)
	{
		options.position.x = this.x - this.xSpeed * dTime * i;
		options.position.y = this.y - this.ySpeed * dTime * i;
		options.position.z = this.z - this.zSpeed * dTime * i;

		cloudParticleSystem.spawnParticle( options );
	}
}

function ShipBit(x, y, z, size)
{
	this.x = x;
	this.y = y;
	this.z = z;

	if (size > 1.5)
		size = 1.5;

	this.xSpeed = size * (Math.random() - 0.5) * 5;
	this.ySpeed = size * Math.random() * 6 + 1;
	this.zSpeed = size * (Math.random() - 0.5) * 5;

	this.size = size;
	this.lifeTime = 0;
}

ShipBit.prototype.update = function(dTime) {

	this.lifeTime += dTime;

	this.ySpeed -= 0.001 * dTime;


	dTime /= 50;

	this.x += this.xSpeed * dTime;
	this.y += this.ySpeed * dTime;
	this.z += this.zSpeed * dTime;

	if (this.y < -1000 || this.lifeTime > 5000)
	{
		var i = objects.indexOf(this);
		if (i != -1)
			objects.splice(i, 1);
	}

	options.position.x = this.x;
	options.position.y = this.y;
	options.position.z = this.z;
	options.size = 20 * this.size * (1 + Math.random());
	options.lifetime = 1000;
	options.color = 0xf4b342;
	options.velocityRandomness = 0.0002;
	options.colorRandomness = 0.01;

	cloudParticleSystem.spawnParticle( options );
} 

function Ship (x, y, z, body, team, size, color, modelSize) {
    this.body = body;

    this.startX = x;
    this.startY = y;
    this.startZ = z;
	this.x = x;
	this.y = y;
	this.z = z;

	this.xSpeed = 0;
	this.ySpeed = 0;
	this.zSpeed = 0;

	this.team = team;
	this.rofSpeed = 50 + Math.random() * Math.random() * 1000;

	this.rof = Math.random() * 1000;
	this.clip = 5;
	this.rot = Math.random() * Math.PI * 2;
	this.life = (50 + Math.random() * 500) * size;

	this.rotSpeed = 0.0005 - 0.001 * Math.random();

	var rot = -Math.atan2(this.x, this.z) + Math.PI / 4;
	var warpDist = 10000;
	this.warpX = Math.cos(rot) * warpDist;
	this.warpZ = Math.sin(rot) * warpDist;
	this.warp = Math.random() * 50 + 14;
	if (testMode)
		this.warp = 0;

	this.clipSize = (1 + Math.random() * 30 * Math.random()) * size * 0.4;

	body.scale.set(modelSize, modelSize, modelSize);
	this.color = color;
	this.size = size;
	this.shudder = 0;

	this.spinX = 0;
	this.spinZ = 0;
}
 
Ship.prototype.damage = function(dmg, x, y)
{
	if (this.life > 0)
	{
		this.life -= dmg;
		this.shudder += 20 * Math.random() * Math.random() / this.size;
		this.spinX += (Math.random() - 0.5) * Math.random() * Math.random() * Math.random() / this.size;
		this.spinZ += (Math.random() - 0.5) * Math.random() * Math.random() * Math.random() / this.size;

		this.xSpeed += x * 0.02 * Math.random() * Math.random() / this.size;
		this.zSpeed += y * 0.02 * Math.random() * Math.random() / this.size;

		if (this.life <= 0)
		{

			for (var i = 0; i < 10 * this.size; i++)
				objects.push(new ShipBit(this.x, this.y, this.z, this.size));

			options.position.x = this.x;
			options.position.y = this.y;
			options.position.z = this.z;
			options.size = 300 * this.size;
			options.lifetime = 5000;
			options.color = 0xf4b342;
			options.velocityRandomness = 0.01;
			options.colorRandomness = 0;

			for (var i = 0; i < 10; i++)
				cloudParticleSystem.spawnParticle( options );
			options.size = 400 * this.size;
			for (var i = 0; i < 4; i++)
				cloudParticleSystem.spawnParticle( options );

			options.lifetime = 1500;
			options.velocityRandomness = 0.1;
			options.size = 10 * this.size;
			for (var i = 0; i < 100; i++)
			{
				cloudParticleSystem.spawnParticle( options );
			}
		}
	}
}

Ship.prototype.update = function(dTime) {

	if (this.warp > 0)
	{
		this.xSpeed = 0;
		this.zSpeed = 0;
		for (var i = 0; i < 10; i++)
		{
			this.x = this.startX * (1 - this.warp) + this.warpX * this.warp;
			this.y = this.startY;
			this.z = this.startZ * (1 - this.warp) + this.warpZ * this.warp;
			this.warp -= 0.005;
			this.shudder = 10;

			if (this.warp < 0.2)
			{
				options.position.x = this.x;
				options.position.y = this.y;
				options.position.z = this.z;
				options.size = 220 * this.size * (1 - this.warp);
				options.lifetime = 1000;
				options.color = this.color;
				options.velocityRandomness = 0.0;
				options.colorRandomness = 0;
				cloudParticleSystem.spawnParticle( options );

				options.size = 30 * this.size * (1 - this.warp);
				ringParticleSystem.spawnParticle( options );
			}
		}
	}
	else
	{
		this.shudder *= 0.9;
		this.xSpeed *= 0.9;
		this.zSpeed *= 0.9;

		if (this.size > 1)
		{
			var dist = Math.sqrt(this.x * this.x + this.z * this.z)
			var buff = 60 * this.size;
			if (dist < buff && dist > 0)
			{
				this.x *= buff / dist;
				this.z *= buff / dist;
			}
		}

		this.x += this.xSpeed * dTime / 10;
		this.z += this.zSpeed * dTime / 10;

		this.rof += dTime * this.size / 0.4;

		if (this.life > 0)
		{
			if (!this.target || Math.random() > 0.99)
			{
				var bestDistance = 100000000;
				this.target = null;
				for (var i = 0; i < allShips.length; i++)
				{
					var ship = allShips[i];
					if (ship.team != this.team && ship.life > 0 && ship.warp <= 0)
					{
						var dx = ship.x - this.x;
						var dy = ship.y - this.y;
						var dz = ship.z - this.z;

						var dist = dx * dx + dy * dy + dz * dz;
						if (dist < bestDistance)
						{
							bestDistance = dist;
							this.target = ship;
						}
					}
				}
			}

			if (this.rof > this.rofSpeed && this.target && this.target.warp <= 0 && this.target.life > 0)
			{
				this.rof = 0;
				if (this.clip > 0)
				{
					objects.push(new Missle(this.x, this.y, this.z, this.target, this.color));
					this.clip--;
				}
				else
				{
					this.clip = this.clipSize;
					this.rof = -1000;
					if (Math.random() > 0.5)
						this.rotSpeed = 0.0005 - 0.001 * Math.random();
				}
			}
		}

		var speed = dTime * 0.5 / this.size * 0.4;
		this.x += Math.cos(this.rot) * speed;
		this.z += Math.sin(this.rot) * speed;

		if (this.life > 0)
		{
			this.body.rotation.x *= 0.9;
			this.body.rotation.z *= 0.95;

			this.body.rotation.x += this.spinX * dTime / 100;
			this.body.rotation.z += this.spinZ * dTime / 100;

			this.spinX *= 0.8;
			this.spinZ *= 0.7;

			this.rot += dTime * this.rotSpeed / this.size * 0.4;

			if (this.x * this.x + this.z * this.z > 2500 * 2500)
			{
				this.rot = -Math.atan2(-this.x, -this.z) + Math.PI / 2;
				this.rotSpeed = 0;
			}
		}
		else
		{
			this.spinX = 0;
			this.spinZ = 0;
			// death particles

			this.body.rotation.x += dTime * 0.0025 / this.size;
			this.body.rotation.z += dTime * this.rotSpeed * 4 / this.size;
			this.body.rotation.y += dTime * this.rotSpeed * 1.5 / this.size;

			this.life -= dTime;
			this.ySpeed -= dTime / 100;
			this.y += this.ySpeed * dTime / 100;

			if (this.life < -10000)
			{
				this.life = (50 + Math.random() * 500) * this.size;
				this.warp = 1;
				this.ySpeed = 0;
				this.position.x = 0;
				this.position.y = 0;
				this.position.z = 0;
			}
			options.position.x = this.x + (this.size * 10 - this.size * 20 * Math.random()) * 1.25;
			options.position.y = this.y + (this.size * 10 - this.size * 20 * Math.random()) * 1.25;
			options.position.z = this.z + (this.size * 10 - this.size * 20 * Math.random()) * 1.25;
			options.size = (30 + Math.random() * 20) * this.size * 4;
			options.lifetime = 1000;
			options.color = 0xf4c141;
			options.velocityRandomness = 0.01;
			options.colorRandomness = 0.5;
			cloudParticleSystem.spawnParticle( options );
		}


		this.body.rotation.y = -this.rot + Math.PI;
	}
	var shudderMult = this.shudder / 4;
	this.x += (0.5 - Math.random()) * shudderMult;
	this.y += (0.5 - Math.random()) * shudderMult;
	this.z += (0.5 - Math.random()) * shudderMult;
	this.body.position.set(this.x, this.y, this.z);
};


var modelLoader = new THREE.GLTFLoader();

var shipReflective = 0.5;
modelLoader.load(

	'models/star_viper_free/scene.gltf',

	function ( gltf ) {

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {

				console.log();
				child.material =  new THREE.MeshPhongMaterial( {

					envMap: 		textureCube,
					emissive: 		0xffffff,
					emissiveMap: 	child.material.emissiveMap,
					reflectivity:   shipReflective,
					specular:  		0xffffff,

					normalMap: 		child.material.normalMap,
					aoMap: 			child.material.aoMap,
					color: 			0xffffff,
					wireframe: 		false,
				});
				child.rotation.y = Math.PI / 2;

			}
		});

		for (var i = 1; i < 20; i++)
		{
			var two = gltf.scene.clone();

			var color = 0x6691ff;
			var size = 0.6;
			var faction = 0;

			var rot = Math.PI * 2 * (faction / 3 + (Math.random() - 0.5) / 2);
			var dist = 1200 + 2500 * Math.random() * Math.random();
			if (size > 3)
				dist += 600;

			newShip = new Ship(Math.cos(rot) * dist, 200 - Math.random() * 400, Math.sin(rot) * dist, two, faction, size, color, 0.3);

			objects.push(newShip);
			allShips.push(newShip);

			scene.add( two );
		}
	},
	// called while loading is progressing
	function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	},
	// called when loading has errors
	function ( error ) {

		console.log( 'An error happened' , error);

	}
);


modelLoader.load(

	'models/scout_rs28/scene.gltf',

	function ( gltf ) {

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {

				console.log(child.material);
				child.material =  new THREE.MeshStandardMaterial( {

					envMap: 		textureCube,

					emissive: 		0xffffff,
					emissiveMap: 	child.material.emissiveMap,

					metalnessMap: 	child.material.metalnessMap,
					roughnessMap: 	child.material.roughnessMap,

					specular:  		0xc6ffd4,

					normalMap: 		child.material.normalMap,
					aoMap: 			child.material.aoMap,
					color: 			0xc6ffd4,
					wireframe: 		false,
				});


				// child.rotation.y = Math.PI / 2;

			}
		});

		for (var i = 1; i < 6; i++)
		{
			var two = gltf.scene.clone();

			var color = 0x6691ff;
			var size = 0.6;
			var faction = 0;

			faction = 1;
			size = 2;
			color = 0x6dff68;

			var rot = Math.PI * 2 * (faction / 3 + (Math.random() - 0.5) / 2);
			var dist = 1200 + 2500 * Math.random() * Math.random();
			if (size > 3)
				dist += 600;

			newShip = new Ship(Math.cos(rot) * dist, 200 - Math.random() * 400, Math.sin(rot) * dist, two, faction, size, color, 200);

			objects.push(newShip);
			allShips.push(newShip);

			scene.add( two );
		}
	},
	// called while loading is progressing
	function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	},
	// called when loading has errors
	function ( error ) {

		console.log( 'An error happened' , error);

	}
);


modelLoader.load(

	'models/space_ship/scene.gltf',

	function ( gltf ) {

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {

				child.material =  new THREE.MeshStandardMaterial( {

					envMap: 		textureCube,
					reflectivity:   shipReflective,
					specular:  		0xffe2aa,

					metalnessMap: 	child.material.metalnessMap,
					roughnessMap: 	child.material.roughnessMap,

					map: 			child.material.map,
					normalMap: 		child.material.normalMap,
					aoMap: 			child.material.aoMap,
					color: 			0xffe2aa,
					wireframe: 		false,
				});
				// child.rotation.y = Math.PI / 2;

			}
		});

		for (var i = 1; i < 3; i++)
		{
			var two = gltf.scene.clone();

			var color = 0x6691ff;
			var size = 0.6;
			var faction = 0;

			faction = 2;
			size = 10;
			color = 0xff6868;

			var rot = Math.PI * 2 * (faction / 3 + (Math.random() - 0.5) / 2);
			var dist = 1200 + 2500 * Math.random() * Math.random();
			if (size > 3)
				dist += 600;

			newShip = new Ship(Math.cos(rot) * dist, 200 - Math.random() * 400, Math.sin(rot) * dist, two, faction, size, color, 60);

			objects.push(newShip);
			allShips.push(newShip);

			scene.add( two );
		}
	},
	// called while loading is progressing
	function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	},
	// called when loading has errors
	function ( error ) {

		console.log( 'An error happened' , error);

	}
);
