var renderer = new THREE.WebGLRenderer();
var lastTime = new Date().getTime();
var currentlyPressedKeys = {};
var day = 0;

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 45000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 0, 0 );
camera.far = 100000;

var scene = new THREE.Scene();
renderer.setClearColor( 0xe0faff, 1 );


var loader = new THREE.TextureLoader();
var flower = loader.load( "tex/flower2.png" );
var grass = loader.load( "tex/grass1.png" );
var bush = loader.load( "tex/bush.png" );
var grassTex = loader.load("tex/grasstex.jpg");
var butterfly = loader.load("tex/butterfly.png");
var spark = new THREE.TextureLoader().load( "tex/spark.jpg" );
grassTex.wrapS = THREE.RepeatWrapping;
grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set( 10, 10 );
var allUniforms = [];
var sunLight;

uniforms = {
	texture:    { type: "t", value: flower },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms);
makeGrass(-300, 300, 20, flower, 5, 53, uniforms);

uniforms2 = {
	texture:    { type: "t", value: grass },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms2);
makeGrass(-500, 500, 20, grass, 100, 75, uniforms2);

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

function makeBushes(uniforms)
{
	for (var i = 0; i < 10; i++)
	{
		var step = 100;
		var x = 500 - 1000 * Math.random();
		var z = 500 - 1000 * Math.random();
		for (var j = 0; j < 3; j++)
			makeBush(x + step * Math.random() - step / 2, 0, z + step * Math.random() - step / 2, bush, 100 + 50 * Math.random(), 100 + 50 * Math.random(), uniforms);
	}
}

makeBeams();
function makeBeams()
{
	var planeGeometry = new THREE.PlaneGeometry(6000, 200, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	mesh.position.y = 50;
	mesh.rotation.z = Math.PI / 20;

	for (var i = 0; i < 10; i++)
	{
		mesh.position.y = 30 + Math.random() * 10;
		mesh.position.x = 200 -600 * Math.random();
		mesh.position.z = -800 + Math.random() * 1600;
		THREE.GeometryUtils.merge(geometry, mesh);
	}

	uniforms = {
		texture:    { type: "t", value: spark },
		globalTime:	{ type: "f", value: 0.0 },
		globalColor: 	{ type: "v3", value: new THREE.Vector3() },
	};
	allUniforms.push(uniforms);


	mat = new THREE.MeshBasicMaterial({
		color: 0xf79e04, map: spark, wireframe: false, side: THREE.DoubleSide});
	mat.transparent = true;
	mat.depthWrite = false;
	mat.opacity = 0.1;
	mat.blending = THREE.AdditiveBlending;
	var grass = new THREE.Mesh(geometry, mat);
	scene.add( grass );
}

var uniforms;
function makeGrass(start, end, step, tex, w, h, uniforms)
{
	var planeGeometry = new THREE.PlaneGeometry(w, h, 1, 1);
	var mesh = new THREE.Mesh(planeGeometry);
	var geometry = new THREE.Geometry();
	for (var x = start; x < end; x += step)
	{
		for (var z = start; z < end; z += step)
		{
			mesh.rotation.y = Math.random() * Math.PI * 2;
			mesh.position.set(x, 0, z);
			
			mesh.position.x += Math.random() * step - step / 2;
			mesh.position.z += Math.random() * step - step / 2;

			mesh.scale.y = 1.1 - Math.random() * 0.4;
			
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

makeHills(uniforms4, 4500, 500);
makeHills(uniforms4, 10000, 1000);
function makeHills(uniforms, r, size)
{
	var geometry = new THREE.SphereGeometry( size, 50, 50 );
	geometry.scale(5, 2, 5);

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'hillvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'hillfragmentshader' ).textContent,
		wireframe: 		false,
	});

	for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 5)
	{
		var rot2 = rot + r;
		var r2 = r + 4000 * Math.random() - 500;
		var x = Math.cos(rot2) * r2;
		var z = Math.sin(rot2) * r2;
		var sphere = new THREE.Mesh( geometry, material );
		sphere.position.set(x, -size, z);

		scene.add( sphere );
	}
}


uniforms5= {
	texture:    { type: "t", value: butterfly },
	globalTime:	{ type: "f", value: 0.0 },
	globalColor: 	{ type: "v3", value: new THREE.Vector3() },
};
allUniforms.push(uniforms5);

butterflies = [];
for (var  i = 0; i < 8; i++)
{
	var geometry = new THREE.PlaneGeometry(5, 5, 2, 2);

	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms5,
		vertexShader:   document.getElementById( 'flyvertexshader' ).textContent,
		fragmentShader: document.getElementById( 'flyfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	var body = new THREE.Mesh( geometry, material );

	var x = Math.random() * 600 - 300;
	var y = Math.random() * 50 + 20;
	var z = Math.random() * 600 - 300;

	body.position.set(x, y, z);
	body.rotation.x = Math.PI / 2;
	scene.add( body );

	var fly = {};
	fly.body = body;
	fly.from = {};
	fly.from.x = x;
	fly.from.y = y;
	fly.from.z = z;
	fly.to = {};
	fly.to.x = Math.random() * 900 - 450;
	fly.to.y = Math.random() * 50 + 20;
	fly.to.z = Math.random() * 900 - 450;
	fly.time = 0;
	body.rotation.z = -Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z);

	butterflies.push(fly);
}


makeTrees(uniforms2, 600, 60);
makeTrees(uniforms2, 800, 60);
makeTrees(uniforms2, 1000, 90);
makeTrees(uniforms2, 1500, 100);
function makeTrees(uniforms, r, size)
{
	var material = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   document.getElementById( 'grassvertexshader2' ).textContent,
		fragmentShader: document.getElementById( 'grassfragmentshader' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	var geometry = new THREE.Geometry();

	for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 30)
	{
		var r2 = r;
		var rot2 = rot;

		var planeGeometry = new THREE.PlaneGeometry(r * Math.PI / 30, size, 1, 1);
		var mesh = new THREE.Mesh(planeGeometry);

		mesh.position.set(Math.cos(rot2) * r2, size / 4, Math.sin(rot2) * r2)
		
		THREE.GeometryUtils.merge(geometry, mesh);

		mesh.rotation.y = -rot2 + Math.PI / 2;
		THREE.GeometryUtils.merge(geometry, mesh);
	}


	var grass = new THREE.Mesh(geometry, material);
	scene.add( grass );
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

for (var rot = 0; rot < Math.PI * 2; rot += Math.PI / 10)
{
	var spriteMap = new THREE.TextureLoader().load( "tex/spark.jpg" );
	var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff } );
	spriteMaterial.blending = THREE.AdditiveBlending;
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.x = sprite.scale.y = 10;

	var r = 500 * Math.random();
	sprite.position.set(Math.cos(rot) * r, 20 + Math.random() * 100, Math.sin(rot) * r);
	scene.add( sprite );
}

for (var rot = 0; rot < Math.PI * 2; rot += Math.PI)
{
	var spriteMap = new THREE.TextureLoader().load( "tex/gold.jpg" );
	var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff } );
	spriteMaterial.blending = THREE.AdditiveBlending;

	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.x = sprite.scale.y = 500;
	rot2 = Math.random() * Math.PI / 2 + rot;
	r = 500 * Math.random() + 500;
	sprite.position.set(Math.cos(rot2) * r, 150, Math.sin(rot2) * r);
	scene.add( sprite );
}

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


var targetCamHeight = 75;
var targetCamRot = Math.PI * 0.85;
var camHeight = 75;
var camRot = targetCamRot;
var day = 0.0;
var dayUp = true;
function animate() {
	requestAnimationFrame( animate );

	var night = 1 - day;
	var timeNow = new Date().getTime();
	var rot = camRot;

	camera.position.set( 400 * Math.cos(rot), camHeight, 400 * Math.sin(rot));
	camera.lookAt( 0, 0, 0 );

	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;

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
	sunLight.position.y = 1050 * day;

	targetCamRot += 0.00001 * deltaTime;

	for (var  i = 0; i < butterflies.length; i++)
	{
		var fly = butterflies[i];
		fly.time += deltaTime * 0.00003;

		if (fly.time > 1)
		{
			fly.from.x = fly.to.x;
			fly.from.y = fly.to.y;
			fly.from.z = fly.to.z;

			fly.to.x = Math.random() * 1200 - 600;
			fly.to.y = Math.random() * 50 + 20;
			fly.to.z = Math.random() * 1200 - 600;

			fly.time = 0;
			fly.body.rotation.z = -Math.atan2(fly.to.x - fly.from.x, fly.to.z - fly.from.z);
		}

		fly.body.position.set(fly.from.x + (fly.to.x - fly.from.x) * fly.time, fly.from.y + (fly.to.y - fly.from.y) * fly.time, fly.from.z + (fly.to.z - fly.from.z) * fly.time)
	}

	for (var i = 0; i < allUniforms.length; i++)
	{
		var uniforms = allUniforms[i];
		uniforms.globalTime.value += deltaTime * 0.0012;

		var red = 1.1 * day + 0.01 * night;
		var green = 1.05 * day + 0.04 * night;
		var blue = 1 * day + 0.08 * night;

		uniforms.globalColor.value.x = red;
		uniforms.globalColor.value.y = green;
		uniforms.globalColor.value.z = blue;
	}

	{
		var red = 0.8 * day + 0.1 * night;
		var green = 0.9 * day + 0.2 * night;
		var blue = 1 * day + 0.4 * night;
		renderer.setClearColor( new THREE.Color( red, green, blue ), 1 );
	}

	if (currentlyPressedKeys[87] || currentlyPressedKeys[38])
	{
		targetCamHeight += 0.1 * deltaTime;
		if (targetCamHeight > 160)
			targetCamHeight = 160;
	}
	if (currentlyPressedKeys[83] || currentlyPressedKeys[40])
	{
		targetCamHeight -= 0.1 * deltaTime;
		if (targetCamHeight < 30)
			targetCamHeight = 30;
	}

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

	renderer.render( scene, camera );
	lastTime = timeNow;
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
		console.log( "Lets go!" , gltf.scene);

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {
				console.log(child.material);
				
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
		gltf.scene.position.y += 20;

		for (var i = 0; i < 2; i++)
		{
			var two = gltf.scene.clone();
			var rot = 1;
			if (i == 1)
				rot = 2;
			var r = 500 + Math.random() * 500;

			two.position.x += Math.cos(rot) * r;
			two.position.z += Math.sin(rot) * r;
			two.rotation.y = Math.random() * Math.PI * 2;

			var scale = 5 + Math.random() * 10;
			two.scale.set(scale, scale, scale);

			scene.add( two );
		}

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
