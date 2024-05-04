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

var renderer = new THREE.WebGLRenderer();
var lastTime = new Date().getTime();
var firstTime = lastTime;
var currentlyPressedKeys = {};
var day = 0;

const shouldMakeWater = true;
const shouldMakeAur = true;

renderer.setSize( window.innerWidth, window.innerHeight );
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


var fov = 28 * (1 + window.innerHeight / window.innerWidth);
if (fov < 45)
	fov = 45;

var camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, 1, 45000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 0, 0 );
camera.far = 100000;

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
	console.log(camera);

	var fov = 28 * (1 + window.innerHeight / window.innerWidth);
	if (fov < 45)
		fov = 45;

	camera.fov = fov;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

var scene = new THREE.Scene();
renderer.setClearColor( 0x0, 1 );


var tex = "cloud.jpg"
var urls = [ "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex ];
var textureCube = THREE.ImageUtils.loadTextureCube( urls );
// scene.background = textureCube;

var loader = new THREE.TextureLoader();
var flower = loader.load( "tex/flower2.png" );
var grass = loader.load( "tex/grass1.png" );
var bush = loader.load( "tex/bush.png" );
var grassTex = loader.load("tex/grasstex.jpg");
var butterfly = loader.load("tex/butterfly.png");
var bird = loader.load("tex/bird.png");
var spark = new THREE.TextureLoader().load( "tex/spark.jpg" );
grassTex.wrapS = THREE.RepeatWrapping;
grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set( 10, 10 );
var allUniforms = [];
var sunLight;


grassUniforms = {
	texture:    { type: "t", value: grass },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(grassUniforms);

let grassRad = 0;
//for (let theta = 0; theta < Math.PI * 2; theta += Math.PI * 0.1)
let theta = 0;
	makeGrass(grassRad * Math.sin(theta), grassRad * Math.cos(theta), 200, grass, 100, 75, grassUniforms);

grassRad = 4000;
for (let theta = 0; theta < Math.PI * 2; theta += Math.PI * 0.25)
	makeGrass(grassRad * Math.sin(theta), grassRad * Math.cos(theta), 200, grass, 100, 75, grassUniforms);

uniforms3= {
	texture:    { type: "t", value: bush },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms3);
uniforms4= {
	texture:    { type: "t", value: grassTex },
	globalTime:	{ type: "f", value: 0.0 }, 
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms4);
makeBushes(uniforms3);
makeBush(0, 0, 0, bush, 50, 50,uniforms3);


uniformsAur = {
	texture:    { type: "t", value: bird },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniformsAur);
makeAur(-5000, 5000, 200, bird, 500, 400, uniformsAur, 800);


var sparkParticleSystem = new THREE.GPUParticleSystem( {
	maxParticles: 250000,
	particleSpriteTex: loader.load("tex/circle.png")
} );
scene.add( sparkParticleSystem );

function makeBushes(uniforms)
{
	for (var i = 0; i < 6; i++)
	{
		var step = 100;
		var x = 1500 - 3000 * Math.random();
		var z = 1500 - 3000 * Math.random();
		for (var j = 0; j < 3; j++)
			makeBush(x + step * Math.random() - step / 2, 0, z + step * Math.random() - step / 2, bush, 100 + 150 * Math.random(), 100 + 50 * Math.random(), uniforms);
	}
}

makeBeams();
function makeBeams()
{
	var planeGeometry = new THREE.PlaneGeometry(6000, 1000, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	mesh.position.y = 50;
	mesh.rotation.z = Math.PI / 2;

	for (var i = 0; i < 20; i++)
	{
		mesh.position.y = 30 + Math.random() * 10;
		mesh.position.x = 1000 - 2000 * Math.random();
		mesh.position.z = -2000 + Math.random() * 4000;
		THREE.GeometryUtils.merge(geometry, mesh);
	}

	uniforms = {
		texture:    { type: "t", value: spark },
		globalTime:	{ type: "f", value: 0.0 },
		globalColor: 	{ type: "v3", value: new THREE.Vector3() },
	};
	allUniforms.push(uniforms);


	mat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(0, 0, 1), map: spark, wireframe: false, side: THREE.DoubleSide});
	mat.transparent = true;
	mat.depthWrite = false;
	mat.opacity = 0.1;
	mat.blending = THREE.AdditiveBlending;
	var grass = new THREE.Mesh(geometry, mat);
	scene.add( grass );
}

makeLights();
function makeLights()
{
	var planeGeometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	mesh.position.y = 50;

	for (var i = 0; i < 3; i++)
	{
		const rot = Math.PI * Math.random() * 2.0;
		const rad = 20000;
		mesh.position.y = 30 + Math.random() * 10;
		mesh.position.x = Math.cos(rot) * rad;
		mesh.position.z = Math.sin(rot) * rad;
		mesh.rotation.y = -rot + Math.PI * 0.001 * Math.random();// + Math.PI / 2;
		mesh.scale.y = 1;

		THREE.GeometryUtils.merge(geometry, mesh);

	}

	mat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(1, 1, 1), map: spark, wireframe: false, side: THREE.DoubleSide});
	mat.transparent = true;
	mat.depthWrite = false;
	mat.opacity = 1.0;
	mat.blending = THREE.AdditiveBlending;
	var grass = new THREE.Mesh(geometry, mat);
	scene.add( grass );
}

let water;
if (shouldMakeWater) {

	// Water
	var waterGeometry = new THREE.PlaneBufferGeometry( 40000, 40000 );

	water = new Water(
		waterGeometry,
		{
			textureWidth: 1024,
			textureHeight: 1024,
			waterNormals: new THREE.TextureLoader().load( 'tex/waternormals.jpg', function ( texture ) {

				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

			} ),
			alpha: 1.0,
			sunDirection: new THREE.Vector3(1, 1, 1).normalize(),
			sunColor: 0xffffff,
			waterColor: new THREE.Color(0.1, 0.0, 0.),
			distortionScale: 20.1,
		},
		renderer
	);

	water.rotation.x = - Math.PI / 2;
	scene.add( water );
}

function makeGrass(sx, sz, maxRadius, tex, w, h, uniforms)
{	
	maxRadius = 500;
	w = 100;
	h = 100;

	console.info("makeGrass: " + sx + ", " + sz + ", " + maxRadius + ", "  + w + ", " + h + ", ", uniforms);
	const step = 20.0;
	var planeGeometry = new THREE.PlaneGeometry(w, h, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	
	for (let theta = 0; theta < Math.PI * 2; theta += Math.PI * 0.05)
	{
		for (let rad = 30; rad < maxRadius; rad += 60)
		{
			const x = sx + Math.cos(theta) * rad;
			const z = sz + Math.sin(theta) * rad;
			

			mesh.rotation.y = Math.random() * Math.PI * 2;
			mesh.position.set(x, 0, z);
			
			mesh.position.x += Math.random() * step - step / 2;
			mesh.position.z += Math.random() * step - step / 2;

			mesh.scale.y = 1.1 - Math.random() * 0.4;
			
			console.info("makeGrass", mesh);
			THREE.GeometryUtils.merge(geometry, mesh);
		}
	}


	tex.wrapS = THREE.RepeatWrapping;
	var maxAnisotropy = renderer.getMaxAnisotropy();
	tex.anisotropy = maxAnisotropy;

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'grassvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'grassfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});


	var grass = new THREE.Mesh(geometry, material);
	scene.add( grass );
}

function makeAur(start, end, step, tex, w, h, uniforms, y)
{
	if (!shouldMakeAur)
		return;

	var planeGeometry = new THREE.PlaneGeometry(w + Math.random() * w, h + Math.random() * h, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	
	for (var x = start; x < end; x += step)
	{
		for (var z = start; z < end; z += step)
		{
			mesh.rotation.y = Math.random() * Math.PI * 2;
			// mesh.rotation.x = Math.PI * 0.5;
			mesh.position.set(x, y + Math.random() * y, z);
			
			mesh.position.x += Math.random() * step - step / 2;
			mesh.position.z += Math.random() * step - step / 2;

			mesh.scale.y = 1.1 - Math.random() * 0.4;
			
			THREE.GeometryUtils.merge(geometry, mesh);
		}
	}

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'aurvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'aurfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});
	material.transparent = true;
	material.blending = THREE.AdditiveBlending;
	material.depthWrite = false;


	var grass = new THREE.Mesh(geometry, material);
	scene.add( grass );
}

makeHills(uniforms4, 25000, 500);
makeHills(uniforms4, 30000, 1000);
function makeHills(uniforms, r, size)
{
	var geometry = new THREE.SphereGeometry( size, 50, 50 );
	geometry.scale(5, 0.5, 5);

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'hillvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'hillfragmentshader' ).textContent,
		wireframe: 		false,
	});

	for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 10)
	{
		var rot2 = rot + r;
		var r2 = r + 4000 * Math.random() - 500;
		var x = Math.cos(rot2) * r2;
		var z = Math.sin(rot2) * r2;
		var sphere = new THREE.Mesh( geometry, material );
		sphere.position.set(x, 0, z);

		scene.add( sphere );
	}
}


uniforms5= {
	texture:    { type: "t", value: butterfly },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms5);


birdUniforms= {
	texture:    { type: "t", value: bird },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(birdUniforms);

butterflies = [];
for (var  i = 0; i < 16; i++)
{
	var isBird = i >= 8;
	var geometry = new THREE.PlaneGeometry(5, 5, 2, 2);

	var material = new THREE.ShaderMaterial( {
		uniforms: 		isBird ? birdUniforms : uniforms5,
		vertexShader:   document.getElementById( 'flyvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'flyfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	var body = new THREE.Mesh( geometry, material );

	var mult = isBird ? 2 : 1;
	var x = (Math.random() * 600 - 300) * mult;
	var y = Math.random() * 50 + 20;

	if (isBird)
		y = 100 + Math.random() * 150;

	var z = (Math.random() * 600 - 300) * mult;

	body.position.set(x, y, z);
	body.rotation.x = Math.PI / 2;
	scene.add( body );

	var fly = {};
	fly.body = body;
	fly.from = {};
	fly.isBird = isBird;
	fly.from.x = x;
	fly.from.y = y;
	fly.from.z = z;
	fly.to = {};
	fly.to.x = Math.random() * 900 - 450;
	fly.to.y = Math.random() * 50 + 20;
	fly.to.z = Math.random() * 900 - 450;

	if (isBird)
	{
		fly.to.y = 100 + Math.random() * 150;

		var dist = 1500;
		var rot = Math.PI * 2 * Math.random();

		fly.to.x = Math.cos(rot) * dist;
		fly.to.z = Math.sin(rot) * dist;
	}

	fly.time = 0;
	body.rotation.z = -Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z);

	butterflies.push(fly);
}

function makeBush(x, y, z, tex, w, h, uniforms)
{
	var planeGeometry = new THREE.PlaneGeometry(w, h, 4, 4);

	for (var i = 0; i < planeGeometry.vertices.length; i++) {
		planeGeometry.vertices[i].z = 10 - Math.random() * 20;
	};

	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();

	for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 3)
	{
		mesh.rotation.y = rot + (Math.random() * Math.PI) / 5;
		mesh.position.set(x, y, z);
		
		mesh.position.x += Math.random() - 2;
		mesh.position.z += Math.random() - 2;

		mesh.scale.x = 1.1 - Math.random() * 0.2;
		mesh.scale.y = 1.1 - Math.random() * 0.2;
		mesh.scale.z = 1.1 - Math.random() * 0.2;
		
		THREE.GeometryUtils.merge(geometry, mesh);

		mesh.rotation.x = Math.random() * Math.PI * 0.2;
		mesh.rotation.z = Math.random() * Math.PI * 0.2;
		THREE.GeometryUtils.merge(geometry, mesh);
	}

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'bushvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'bushfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});
	var bush = new THREE.Mesh(geometry, material);
	scene.add( bush );	
}

if (false)
for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 10)
{
	var spriteMap = new THREE.TextureLoader().load( "tex/spark.jpg" );
	var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: new THREE.Color(0, 0, 0.15) } );
	spriteMaterial.blending = THREE.AdditiveBlending;
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.x = sprite.scale.y = 10;

	var r = 500 * Math.random();
	sprite.position.set(Math.cos(rot) * r, 20 + Math.random() * 100, Math.sin(rot) * r);
	scene.add( sprite );
}

if (false)
for (var rot = 0; rot < Math.PI * 2; rot += Math.PI)
{
	var spriteMap = new THREE.TextureLoader().load( "tex/gold.jpg" );
	var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: new THREE.Color(0, 0, 0.1) } );
	spriteMaterial.blending = THREE.AdditiveBlending;

	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.x = sprite.scale.y = 500;
	rot2 = Math.random() * Math.PI / 2 + rot;
	r = 500 * Math.random() + 500;
	sprite.position.set(Math.cos(rot2) * r, 150, Math.sin(rot2) * r);
	scene.add( sprite );
}

if (false)
for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 8)
{

	if (rot == 0)
	{	
		var r = 8000;

		var light = new THREE.PointLight( 0xffffff, 1.5, 2000 );
		light.position.set(Math.cos(rot) * r, 1050, Math.sin(rot) * r);
		
		var textureFlare0 = loader.load( "tex/sun.jpg" );

		var lensflare = new THREE.Lensflare();

		lensflare.addElement( new THREE.LensflareElement( textureFlare0, 512, 0 ) );

		var textureFlare1 = loader.load( "tex/gold.jpg" );
		var textureFlare2 = loader.load( "tex/ring.jpg" );
		var textureFlare3 = loader.load( "tex/hex.jpg" );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 1024, 0 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64,  0.05 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64,  0.1 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 256, 0.2 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64, 0.3 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 400, 0.4 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare3, 64,  0.5 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64,  0.6 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 128, 0.7 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare3, 256, 0.8 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 400, 0.9 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 600, 0.95 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare2, 400, 1 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64,  1.1 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare2, 500, 1.1 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 800, 1.2 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 64,  1.3 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 600, 1.4 ) );

		light.add( lensflare );
		scene.add(light);
		sunLight = light;
	}
	var r = 4000;


	{
		var spriteMap = new THREE.TextureLoader().load( "tex/blue.jpg" );
		var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff } );
		spriteMaterial.blending = THREE.AdditiveBlending;

		var sprite = new THREE.Sprite( spriteMaterial );
		sprite.scale.x = sprite.scale.y = 3000;
		sprite.position.set(Math.cos(rot) * r, 500 + Math.random() * 100, Math.sin(rot) * r);
		scene.add( sprite );
	}

}

var particleSpawners = [];
	
for (var i = 0; i < 3; i++)
{
	var spawn = {};

	spawn.from = {};
	spawn.from.x = x;
	spawn.from.y = y;
	spawn.from.z = z;
	spawn.to = {};
	spawn.to.x = Math.random() * 900 - 450;
	spawn.to.y = Math.random() * 50 + 20;
	spawn.to.z = Math.random() * 900 - 450;
	spawn.time = 1;
	particleSpawners.push(spawn);
}

var options = {
	position: new THREE.Vector3(),
	positionRandomness: 0,
	velocity: new THREE.Vector3(0.01, 0.0, 0),
	velocityRandomness: 0.02,
	color: new THREE.Color(0, 0, 1),
	colorRandomness: 0.05,
	turbulence: .002,
	lifetime: 1000,
	size: 1.5,
	sizeRandomness: 0,
};

var options2 = {
	position: new THREE.Vector3(),
	positionRandomness: 0,
	velocity: new THREE.Vector3(0.0, -0.1, 0),
	velocityRandomness: 0.02,
	color: new THREE.Color(0, 0, 1),
	colorRandomness: 0.05,
	turbulence: .002,
	lifetime: 5000,
	size: 2,
	sizeRandomness: 0,
};

var targetCamHeight = 75;
var targetCamRot = Math.PI * 0.85;
var camHeight = 75;
var camRot = targetCamRot;
var day = 0.0;
var dayUp = true;
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

	var night = 1 - day;
	var timeNow = new Date().getTime();
	var rot = camRot;

	const camDist = 2000;
	camera.position.set( camDist * Math.cos(rot), camHeight, camDist * Math.sin(rot));
	camera.lookAt( 0, 80, 0 );

	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;

	if (water)
		water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

	if (dayUp)
		day += 0.00001 * deltaTime;
	else
		day -= 0.00001 * deltaTime;

	if (day > 1)
	{
		dayUp = false;
		day = 1;
	}
	else if (day < 0)
	{
		dayUp = true;
		day = 0;
	}
	day = 1;
	// sunLight.position.y = 1050 * day;

	targetCamRot += 0.00001 * deltaTime;

	for (var  i = 0; i < butterflies.length; i++)
	{
		var fly = butterflies[i];
		fly.time += deltaTime * 0.00003;
		if (fly.isBird)
			fly.time += deltaTime * 0.00006;

		if (fly.time > 1)
		{
			fly.from.x = fly.to.x;
			fly.from.y = fly.to.y;
			fly.from.z = fly.to.z;

			var mult = 1;
			fly.to.x = (Math.random() * 1200 - 600) * mult;
			fly.to.z = (Math.random() * 1200 - 600) * mult;
			fly.to.y = Math.random() * 50 + 20;
			if (fly.isBird)
			{
				var dist = 1500;
				var rot = Math.PI * 2 * Math.random();

				fly.to.x = Math.cos(rot) * dist;
				fly.to.z = Math.sin(rot) * dist;
				fly.to.y = Math.random() * 150 + 100;
			}


			fly.time = 0;
			fly.body.rotation.z = -Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z);
		}

		fly.body.position.set(fly.from.x + (fly.to.x - fly.from.x) * fly.time, fly.from.y + (fly.to.y - fly.from.y) * fly.time, fly.from.z + (fly.to.z - fly.from.z) * fly.time)
	}

	for (var  i = 0; i < particleSpawners.length; i++)
	{
		var fly = particleSpawners[i];
		fly.time += deltaTime * 0.001;

		if (fly.time > 1)
		{
			fly.from.x = fly.to.x;
			fly.from.y = fly.to.y;
			fly.from.z = fly.to.z;

			fly.to.x += Math.random() * 1200 - 600;
			fly.to.y += Math.random() * 5 + 2.5;
			fly.to.z += Math.random() * 1200 - 600;

			if (fly.to.x > 3000 || fly.to.x < -600 || fly.to.z > 600 || fly.to.z < -3000)
			{
				fly.to.x = Math.random() * 1200 - 600;
				fly.to.y = Math.random() * 50 + 20;
				fly.to.z = Math.random() * 1200 - 600;
			}

			fly.time = 0;
		}

		options.position.x = fly.from.x + (fly.to.x - fly.from.x) * fly.time;
		options.position.y = fly.from.y + (fly.to.y - fly.from.y) * fly.time;
		options.position.z = fly.from.z + (fly.to.z - fly.from.z) * fly.time;
		sparkParticleSystem.spawnParticle( options );
	}

	for (var i = 0; i < allUniforms.length; i++)
	{
		var uniforms = allUniforms[i];
		uniforms.globalTime.value += deltaTime * 0.0012;

		var red = 0.02;
		var green = 0.02;
		var blue = 0.05;

		uniforms.globalColor.value.x = red;
		uniforms.globalColor.value.y = green;
		uniforms.globalColor.value.z = blue;
	}

	{
		var red = 0;
		var green = 0.;
		var blue = 0.1;
		renderer.setClearColor( new THREE.Color( red, green, blue ), 1 );
	}


	targetCamHeight += mouseDy * 2.5;
	if (currentlyPressedKeys[87] || currentlyPressedKeys[38])
	{
		targetCamHeight += 0.2 * deltaTime;
	}
	if (targetCamHeight > 1600)
		targetCamHeight = 1600;

	if (currentlyPressedKeys[83] || currentlyPressedKeys[40])
	{
		targetCamHeight -= 0.2 * deltaTime;
	}
	if (targetCamHeight < 30)
		targetCamHeight = 30;

	targetCamRot += mouseDx * 0.002;
	if (currentlyPressedKeys[68] || currentlyPressedKeys[39])
	{
		targetCamRot -= 0.0005 * deltaTime;
	}
	if (currentlyPressedKeys[65] || currentlyPressedKeys[37])
	{
		targetCamRot += 0.0005 * deltaTime;
	}

	targetCamHeight += (75 - targetCamHeight) * 0.01;
	camHeight += (targetCamHeight - camHeight) * 0.1;
	camRot += (targetCamRot - camRot) * 0.01;

	// if (Math.random() > 0.6)
	{
		options2.position.x = (Math.random() - 0.5) * 3000;
		options2.position.z = (Math.random() - 0.5) * 3000;
		options2.position.y = (Math.random()) * 500 + 500;
		sparkParticleSystem.spawnParticle( options2 );
	}

	sparkParticleSystem.update( (timeNow - firstTime) / 25 );

	renderer.render( scene, camera );
	lastTime = timeNow;

	if (window.innerWidth != renderer.getSize().width || window.innerWidth != renderer.getSize().width)
		onWindowResize();
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


var loader = new THREE.GLTFLoader();

// Load a glTF resource
loader.load(

	'models/oak_tree/scene.gltf',

	function ( gltf ) {

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {
				
				var uniforms = {
					texture:    { type: "t", value: child.material.map },
					globalTime:	{ type: "f", value: 0.0 },
					globalColor: 	{ type: "v3", value: new THREE.Vector3() },
				};
				allUniforms.push(uniforms);
				
				child.material =  new THREE.ShaderMaterial( {
					uniforms: 		uniforms,
					vertexShader:   document.getElementById( 'treevertexshader' ).textContent,
					fragmentShader: document.getElementById( 'treefragmentshader' ).textContent,
					wireframe: 		false,
					side: 			THREE.DoubleSide,
				});
			}
		});

		gltf.scene.scale.set(10, 10, 10);

		var planeGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
		var mesh = new THREE.Mesh(planeGeometry);
		var geometry = new THREE.Geometry();
		mesh.position.y = 50;
		mesh.rotation.z = Math.PI / 2;

		for (var i = 0; i < 3; i++)
		{
			var two = gltf.scene.clone();
			var rot = 1;
			if (i == 1)
				rot = 2;
			var r = 500 + Math.random() * 1000;

			two.position.x += Math.cos(rot) * r;
			two.position.z += Math.sin(rot) * r;
			two.rotation.y = Math.random() * Math.PI * 2;

			var scale = 4 + Math.random() * 8;
			two.scale.set(scale, scale, scale);

			scene.add( two );

			mesh.position.x = two.position.x + 100;
			mesh.position.y = 0;
			mesh.position.z = two.position.z;
			// THREE.GeometryUtils.merge(geometry, mesh);
		}

		mat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(0, 0, 1), map: spark, wireframe: false, side: THREE.DoubleSide});
		mat.transparent = true;
		mat.depthWrite = false;
		mat.opacity = 0.1;
		mat.blending = THREE.AdditiveBlending;
		var grass = new THREE.Mesh(geometry, mat);
		scene.add( grass );

		gltf.scene.position.z -= 450;
		gltf.scene.position.x += 100;
		scene.add( gltf.scene );

	},
	// called while loading is progressing
	function ( xhr ) {

		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

	},
	// called when loading has errors
	function ( error ) {

		console.log( 'An error happened' );

	}
);