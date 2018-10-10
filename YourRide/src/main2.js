
var lastTime = new Date().getTime();
var currentlyPressedKeys = { };

//Create a WebGLRenderer and turn on shadows in the renderer
var renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( new THREE.Color(0.1, 0.06, 0.12), 1 );
document.body.appendChild( renderer.domElement );

var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 45000 );
camera.position.set( 200, 200, 200 );
camera.lookAt( 0, 100, 0 );
camera.far = 100000;

var scene = new THREE.Scene();

var cubeGeometry = new THREE.CubeGeometry(1, 1, 1);
var cubeMesh = new THREE.Mesh(cubeGeometry);
var cars = [];


scene.add(new THREE.AmbientLight( 0x555555 ));

{
	//Create a PointLight and turn on shadows for the light
	var light = new THREE.PointLight( 0xcccccc, 2, 3000 );
	light.shadow.camera.far = 2000;
	light.position.set( -600, 600, 600 );
	// light.castShadow = true;
	light.shadow.bias = -0.0008;
	scene.add( light );
}


var loader = new THREE.TextureLoader();
var solarTex = loader.load( "tex/solartex.jpg" );
var cloudTex = loader.load( "tex/cloudtex.jpg" );
var glassTex = loader.load( "tex/glass.jpg" );
var glassTex2 = loader.load( "tex/glass2.jpg" );
var glassBump = loader.load( "tex/glassBump.jpg" );
var building1 = loader.load( "tex/building1.jpg" );
var building2 = loader.load( "tex/building2.jpg" );
var water = loader.load( "tex/water.jpg" );
var glow = loader.load( "tex/glow.jpg" );
var spark = loader.load( "tex/spark.jpg" );
var beamTex = loader.load( "tex/beam.jpg" );
var roadGlow = loader.load( "tex/roadGlow.jpg" );

roadGlow.wrapS = THREE.RepeatWrapping;
roadGlow.wrapT = THREE.RepeatWrapping;
roadGlow.repeat.set( 1, 20 );

var faceTex = loader.load( "tex/face.jpg" );
var faceTex2 = loader.load( "tex/face2.jpg" );

var brand1 = loader.load( "tex/brand1.jpg" );
var brand2 = loader.load( "tex/brand2.jpg" );

var roadTex = loader.load( "tex/road.jpg" );
roadTex.wrapS = THREE.RepeatWrapping;
roadTex.wrapT = THREE.RepeatWrapping;
roadTex.repeat.set( 20, 1 );

var allUniforms = [];
uniforms = {
	texture:    { type: "t", value: faceTex },
	globalTime:	{ type: "f", value: 0.0 },
};
allUniforms.push(uniforms);

var tex = "panorama.jpg"
var urls = [ "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex, "tex/" + tex ];
var textureCube = THREE.ImageUtils.loadTextureCube( urls );
// scene.background = textureCube;


function waterMaterial()
{
	return new THREE.MeshPhongMaterial( {
		envMap: 		textureCube,
		reflectivity:   1,
		depthWrite: 	false,
		specular:  		0xffffff,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
		alphaMap: 			water,
		akoha: 			water,
		transparent: 	true,
		bumpMap: 		water,
	});
}

function glassMaterial(allowExtra)
{
	var bump = solarTex;
	if (Math.random() > 0.8)
		bump = glassBump;
	else if (Math.random() > 0.8)
		bump = glassTex;

	var map = glassTex;
	if (Math.random() > 0.8)
		map = glassBump;
	else if (Math.random() > 0.6)
		map = glassTex2;

	var light = Math.random() * 0.6;
	if (allowExtra)
		light = Math.random() * 1.05;
	if (light > 0.7 && allowExtra)
		light += Math.random() * 1.5;

	var t = 0.7 + Math.random() * 0.4;
	if (allowExtra)
		t = 1;
	var color = new THREE.Color(t, t, t);

	var spec = 0.5;

	return new THREE.MeshPhongMaterial( {
		envMap: 		textureCube,
		reflectivity:   1,
		bumpScale:  	-0.075 - 0.065 * Math.random(),
		bumpMap: 		bump,
		map:  			map,
		specular:  		new THREE.Color(spec * 3, spec * 2, spec),
		wireframe: 		false,
		side: 			THREE.DoubleSide,
		emissive: 		new THREE.Color(light * 3, light * 2, light),
		emissiveMap: 	glow,
		color: 			color,
	});
}

function buildingMaterial()
{	
	var t = Math.random() * 0.25;
	var color = new THREE.Color(t, t, t);
	if (Math.random() > 0.4)
		color = new THREE.Color(t, t, t * 1.25);

	var s = Math.random() * 0.3;
	var spec = new THREE.Color(s, s, s);

 	return new THREE.MeshPhongMaterial( {
		envMap: 		textureCube,
		reflectivity:   0.3 + 0.2 * Math.random(),
		specular:  		0x333333,
		wireframe: 		false,
		map: 			building1,
		bumpMap: 		cloudTex,
		bumpScale:  	Math.random() * 0.15 + 0.1,
		color: 			spec,
	});
}

function roadMaterial(doubleSide)
{
	var t = 0.8;
 	return new THREE.MeshPhongMaterial( {
		envMap: 		textureCube,
		reflectivity:   0.9,
		specular:  		0x111111,
		wireframe: 		false,
		color: 			new THREE.Color(t, t, t),
		map: 			roadTex,
		bumpScale:  	2,
		bumpMap: 		roadTex,
		side: 			THREE.DoubleSide,
		emissive: 		new THREE.Color(1, 0.5, 0.25),
		emissiveMap: 	roadGlow,
	});
}

function metalMaterial(doubleSide)
{
	if (doubleSide)
	{
	 	return new THREE.MeshPhongMaterial( {
			envMap: 		textureCube,
			reflectivity:   0.6,
			specular:  		0x111111,
			wireframe: 		false,
			color: 			0x111111,
			bumpScale:  	1,
			bumpMap: 		cloudTex,
			side: 			THREE.DoubleSide,
		});
	 }
	 else
	 {
	 	return new THREE.MeshPhongMaterial( {
			envMap: 		textureCube,
			reflectivity:   0.025,
			specular:  		0xffffff,
			wireframe: 		false,
			bumpScale:  	0.2,
			bumpMap: 		cloudTex,
			color: 			0x111111,
		});
	 }
}

var whiteMaterial = new THREE.MeshPhongMaterial( {
	color: 			0xffffff,
	side: 			THREE.DoubleSide,
});
// make street lights

function makeStreetLight(x, h, z, geometry)
{
	if (Math.random() > 0.8)
		return;

	cubeMesh.position.set(x, h / 2, z);
 	cubeMesh.scale.set(2, h, 2);
 	THREE.GeometryUtils.merge(geometry, cubeMesh);

	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.depthWrite = false;
	sprite.scale.x = sprite.scale.y = 50;
	sprite.position.set(x, h + 5, z);
	scene.add( sprite );

	if (x * x + z * z < 300 * 300 && x * x + z * z > 100 * 100)
	{
		var lensflare = new THREE.Lensflare();
		var textureFlare1 = loader.load( "tex/gold.jpg" );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 300, 0 ) );
		lensflare.position.set(x, h + 7, z)
		scene.add(lensflare);
	}
}

{

	var geometry = new THREE.Geometry();

	var spriteMap = new THREE.TextureLoader().load( "tex/spark.jpg" );
	var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: new THREE.Color(1.25, 1, 0.95) } );
	spriteMaterial.blending = THREE.AdditiveBlending;

	for (var x = -500; x <= 500; x += 200)
	{
		for (var z = -500; z <= 500; z += 200)
		{
			var offset = 35;
			var h = 50 * Math.random() + 20;

			makeStreetLight(x - offset, h, z - offset, geometry);
			makeStreetLight(x + offset, h, z - offset, geometry);
			makeStreetLight(x - offset, h, z + offset, geometry);
			makeStreetLight(x + offset, h, z + offset, geometry);
		}
	}
	var body = new THREE.Mesh( geometry,  metalMaterial(false) );
	scene.add(body);
}

// make beams
{
	var newUniforms = {
		globalTime:	{ type: "f", value: 1000 * Math.random() },
	};
	allUniforms.push(newUniforms);

	var mat = new THREE.ShaderMaterial( {
		uniforms: 		newUniforms,
		vertexShader:   document.getElementById( 'beamvert' ).textContent,
		fragmentShader: document.getElementById( 'beamfrag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	mat.blending = THREE.AdditiveBlending;
	mat.transparent = true;

	var plane = new THREE.PlaneGeometry(3000, 2, 1, 1);
	var planeMesh = new THREE.Mesh(plane);
	
	var geometry = new THREE.Geometry();

	planeMesh.rotation.y = Math.PI / 2;

	for (var x = -1000; x < 1000; x += 100)
	{
	 	planeMesh.position.set(x, 20, 0);
	 	THREE.GeometryUtils.merge(geometry, planeMesh);
	}

	var body = new THREE.Mesh( geometry, mat );
	scene.add(body);
}


// make glows
makeGlows(new THREE.Color(0.6, 0.3, 0.1), 500);
function makeGlows(color, rScale)
{
	var mat = new THREE.MeshBasicMaterial( {
		map: beamTex,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
		color:  color,
	});

	mat.blending = THREE.AdditiveBlending;
	mat.transparent = true;

	var plane = new THREE.PlaneGeometry(50, 600, 1, 1);
	var planeMesh = new THREE.Mesh(plane);
	
	var geometry = new THREE.Geometry();

	planeMesh.rotation.y = Math.PI / 2;

	rotOff = Math.PI * Math.random();
	for (var rot = 0; rot < Math.PI * 2; rot += Math.PI * 0.1)
	{
		{
			var r = rScale + Math.random() * 200;
			var x = Math.cos(rot + rotOff) * r;
			var z = Math.sin(rot + rotOff) * r;
		 	planeMesh.position.set(x , 0, z);
		 	planeMesh.rotation.y = Math.round((-rot + Math.PI * 0.5) / (Math.PI * 0.5)) * Math.PI * 0.5;
		 	THREE.GeometryUtils.merge(geometry, planeMesh);
		}
	}

	var body = new THREE.Mesh( geometry, mat );
	scene.add(body);
}

{
	var planeGeometry = new THREE.PlaneGeometry(3000, 80, 1, 1);
	var plane = new THREE.Mesh( planeGeometry );

	var geometry = new THREE.Geometry();

	for (var z = -300; z < 500; z += 200)
	{
		plane.rotation.x = Math.PI / 2;
		plane.position.set(0, 0, z);
	 	THREE.GeometryUtils.merge(geometry, plane);
	}

	for (var z = -300; z < 500; z += 200)
	{
		plane.rotation.x = Math.PI / 2;
		plane.rotation.z = Math.PI / 2;
		plane.position.set(z, 1, 0);
	 	THREE.GeometryUtils.merge(geometry, plane);
	}

	var body = new THREE.Mesh( geometry, roadMaterial() );
	body.receiveShadow = true;
	scene.add(body);

	var planeGeometry2 = new THREE.PlaneGeometry(3000, 3000, 1, 1);
	var body = new THREE.Mesh( planeGeometry2, metalMaterial(true) );
	body.position.y = -1;
	body.rotation.x = Math.PI / 2;
	scene.add(body);
}


var start = -1400;
var end = 1400;
var jump = 200;
for (var x = start; x <= end; x += jump)
{
	for (var z = start; z <= end; z += jump)
	{
		if (Math.random() > 0.8 && (x * x + z * z) > 40000 + 20000 * Math.random() && (x * x + z * z) < 1200 * 1200)
		{
			var rot = Math.random() * Math.PI * 2;
			rot = Math.round((-rot + Math.PI * 0.5) / (Math.PI * 0.5)) * Math.PI * 0.5;


			var tex = brand1;
			if (Math.random() > 0.5)
				tex = brand2;

			var newUniforms = {
				texture:    { type: "t", value: tex },
				globalTime:	{ type: "f", value: 1000 * Math.random() },
			};
			allUniforms.push(newUniforms);
			var mat = new THREE.ShaderMaterial( {
				uniforms: 		newUniforms,
				vertexShader:   document.getElementById( 'boardvert' ).textContent,
				fragmentShader: document.getElementById( 'boardfrag' ).textContent,
				wireframe: 		false,
				side: 			THREE.DoubleSide,
			});

			mat.blending = THREE.AdditiveBlending;
			mat.depthWrite = false;
			mat.transparent = true;

			var geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
			var body = new THREE.Mesh( geometry, mat );
			var r = 71;
			body.position.set(x + Math.cos(rot) * r, 150 * Math.random() + 60, z + Math.sin(rot) * r);
			body.rotation.y = Math.round((-rot + Math.PI * 0.5) / (Math.PI * 0.5)) * Math.PI * 0.5;

			var lensflare = new THREE.Lensflare();
			var textureFlare1 = loader.load( "tex/gold.jpg" );
			lensflare.addElement( new THREE.LensflareElement( textureFlare1, 400, 0 ) );
			lensflare.addElement( new THREE.LensflareElement( textureFlare1, 400, 0 ) );
			body.add(lensflare);

			scene.add(body);
		}

		if (x > -500 && x < 500 && z > -500 && z < 500)
		{
			var height = Math.floor(2 + Math.random() * 4);
			var winH = Math.random() * 30 + 24;
			var borderH = Math.random() * 3 + 0.2;

			if (Math.abs(x - z) < 200)
				height = 3;

			if (Math.abs(x) < 10 && Math.abs(z) < 10)
			{
				winH = 60;
				height = 2;
				makeWindows(x, 0, z, 5, height, 5, 20, winH, borderH, borderH);
			}
			else
			{
				var size = 5;
				makeWindows(x, 0, z, size, height, size, 20, winH, borderH, borderH);
				y = (winH + borderH) * height;

				size -= Math.floor(Math.random() * 5) + 1;
				while (size > 2)
				{
					makeWindows(x, y, z, size, 1, size, 20, winH, borderH, borderH);
					y += (winH + borderH);
					size -= Math.floor(Math.random() * 4) + 1;
				}

				y = winH + borderH * 2;

			}
		}
		else
		{
			border = 800;
			if (x > -border && x < border && z > -border && z < border)
				makeBox(x, 0, z, 120, 120 + 350 * Math.random());
			else
				makeBox(x - 100 + Math.random() * 200, 0, z - 100 + Math.random() * 200, 120, 120 + 350 * Math.random());
		}
	}
}

function makeWindows(x, y, z, winX, winY, winZ, winW, winH, borderH, borderW)
{
	var xSize = (winW + borderW * 2) * winX;
	var ySize = (winH + borderH * 2) * winY;
	var zSize = (winW + borderW * 2) * winZ;

	var glassGeometry = new THREE.Geometry();
	var metalGeometry = new THREE.Geometry();

 	// Setup
 	var xRot = 0;
 	var yRot = Math.PI;
 	var zRot = 0;
 	var xStep = winW + borderW * 2;
 	var yStep = winH + borderH * 2;
 	var zStep = 0;

 	// loop
	makeWindowWall(x, y, z - zSize / 2, xSize, ySize, zSize, xStep, yStep, zStep, winX, winY, winZ, metalGeometry, winW, winH, xRot, yRot, zRot, glassGeometry, borderH, borderW);

 	yRot = 0;
	makeWindowWall(x, y, z + zSize / 2, xSize, ySize, zSize, xStep, yStep, zStep, winX, winY, winZ, metalGeometry, winW, winH, xRot, yRot, zRot, glassGeometry, borderH, borderW);

 	yRot = Math.PI / 2;
 	xStep = 0;
 	zStep = winW + borderW * 2;
	makeWindowWall(x + xSize / 2, y, z, xSize, ySize, zSize, xStep, yStep, zStep, winX, winY, winZ, metalGeometry, winW, winH, xRot, yRot, zRot, glassGeometry, borderH, borderW);

 	yRot = -Math.PI / 2;
	makeWindowWall(x - xSize / 2, y, z, xSize, ySize, zSize, xStep, yStep, zStep, winX, winY, winZ, metalGeometry, winW, winH, xRot, yRot, zRot, glassGeometry, borderH, borderW);


	var newY = y + yStep / 2;
 	for (var yi = 0; yi < winY; yi++)
 	{
 		cubeMesh.position.set(x, newY + winH / 2 + borderH, z);
	 	cubeMesh.scale.set(xSize, borderH * 2, zSize);
	 	THREE.GeometryUtils.merge(metalGeometry, cubeMesh);

	 	if (yi == winY - 1)
	 	{
	 		// if (Math.abs(x) > 50 || Math.abs(z) > 50)
	 		{
		 		var geometry = new THREE.PlaneGeometry(winW * 4, winW * 4, 1, 1);
		 		var body = new THREE.Mesh( geometry, waterMaterial(true) );
		 		body.rotation.x = Math.PI / 2;
		 		body.position.set((x + 0.5 - Math.random()) * winX * (winW + borderW) * 0.5, newY + winH / 2 + borderH * 2 + 0.5, z + (0.5 - Math.random()) * winZ * (winW + borderW) * 0.5);
		 		body.receiveShadow = true;
		 		scene.add(body);
		 	}
	 	}

	 	if (yi == 0)
	 	{
	 	 	cubeMesh.position.set(x, y + borderH / 2, z);
		 	cubeMesh.scale.set(xSize, borderH, zSize);
	 	 	THREE.GeometryUtils.merge(metalGeometry, cubeMesh);
	 	}

 		newY += yStep;
 	}

 	var reps = Math.random() * 3 + 1;
 	for (var i = 0; i < reps; i++)
 	{
 		var h = y + winY * (winH + borderH) * (Math.random() * 0.05 + 1);
 	 	cubeMesh.position.set(x + (0.5 - Math.random()) * winX * (winW + borderW) * 0.9, h / 2, z + (0.5 - Math.random()) * winZ * (winW + borderW) * 0.9);
	 	cubeMesh.scale.set(winW * (Math.random() + 1), h, winW * (Math.random() + 1));
 	 	THREE.GeometryUtils.merge(glassGeometry, cubeMesh);	
 	}


 	var metal = new THREE.Mesh(metalGeometry, buildingMaterial(false));
 	metal.castShadow = true;
 	metal.receiveShadow = true;
 	scene.add( metal );


 	var glass = new THREE.Mesh(glassGeometry, glassMaterial(true));
 	glass.castShadow = true;
 	glass.receiveShadow = true;
 	scene.add( glass );
}

function makeWindowWall(x, y, z, xSize, ySize, zSize, xStep, yStep, zStep, winX, winY, winZ, metalGeometry, winW, winH, xRot, yRot, zRot, glassGeometry, borderH, borderW) {

	var indentAmount = -borderW;
	var indentRot = -yRot + Math.PI / 2;
	var indentX = Math.cos(indentRot) * indentAmount;
	var indentZ = Math.sin(indentRot) * indentAmount;

	var newY = y + yStep / 2;

 	for (var yi = 0; yi < winY; yi++)
 	{
		var newX = x - xStep * winX / 2 + xStep / 2;
		var newZ = z - zStep * winZ / 2 + zStep / 2;

	 	for (var xi = 0; xi < winX; xi++)
	 	{	
	 		cubeMesh.position.set(newX + indentX, newY, newZ + indentZ);
		 	cubeMesh.scale.set(winW, winH, 1);
			cubeMesh.rotation.set(xRot, yRot, zRot);
		 	THREE.GeometryUtils.merge(glassGeometry, cubeMesh);

		 	if (xi < winX - 1)
		 	{
		 		cubeMesh.position.set(newX + indentX + xStep / 2, newY, newZ + indentZ + zStep / 2);
			 	cubeMesh.scale.set(borderW * 2, winH, borderW);
				cubeMesh.rotation.set(xRot, yRot, zRot);
			 	THREE.GeometryUtils.merge(metalGeometry, cubeMesh);
			 }


	 		newX += xStep;
	 		newZ += zStep;
		}

 		newY += yStep;
 	}
}

function makeBox(x, y, z, s, h) {

	var geometry = new THREE.BoxGeometry(s, h, s);
	var box = new THREE.Mesh(geometry, glassMaterial(false));
	box.position.set(x, y + h / 2, z)
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add( box );
}

function makePanel(x, y, z) {
	{
		var geometry = new THREE.PlaneGeometry(100, 150, 1, 1);
		var body = new THREE.Mesh( geometry, glassMaterial() );
		body.rotation.x = Math.PI / 2;
		body.rotation.y = Math.PI / 4;

		body.position.set(x, y, z);
		body.castShadow = true;
		body.receiveShadow = true;
		scene.add(body);
	}
	{
		var geometry = new THREE.BoxGeometry(105, 155, 1);
		var body = new THREE.Mesh( geometry, metalMaterial(true) );
		body.rotation.x = Math.PI / 2;
		body.rotation.y = Math.PI / 4;
		body.position.set(x, y - 1, z);
		body.castShadow = true;
		body.receiveShadow = true;
		scene.add(body);
	}

	var geometry = new THREE.PlaneGeometry(5, 75, 1, 1);

	{
		var body = new THREE.Mesh( geometry, metalMaterial(true) );
		body.rotation.y = Math.PI / 2;
		body.position.set(x + 25, y - 15, z + 50);
		body.castShadow = true;
		scene.add(body);
	}
	{
		var body = new THREE.Mesh( geometry, metalMaterial(true) );
		body.position.set(x + 25, y - 15, z + 50);
		body.castShadow = true;
		scene.add(body);
	}

	{
		var body = new THREE.Mesh( geometry, metalMaterial(true) );
		body.rotation.y = Math.PI / 2;
		body.position.set(x + 25, y - 15, z - 50);
		body.castShadow = true;
		scene.add(body);
	}
	{
		var body = new THREE.Mesh( geometry, metalMaterial(true) );
		body.position.set(x + 25, y - 15, z - 50);
		body.castShadow = true;
		scene.add(body);
	}
}


var targetCamHeight = 200;
var targetCamRot = Math.PI * 0.85;
var camHeight = 100;
var camRot = targetCamRot;

var masterCar = null;

function animate() {
	requestAnimationFrame( animate );

	var timeNow = new Date().getTime();
	var rot = camRot;

	camera.position.set( 100 * Math.cos(rot), camHeight, 100 * Math.sin(rot));
	camera.lookAt( 0, 160, 0 );

	var deltaTime = timeNow - lastTime;
	if (deltaTime > 60)
		deltaTime = 60;
	targetCamRot += 0.0001 * deltaTime;

	if (masterCar)
	{
		masterCar.position.y = 160 + Math.cos(timeNow * 0.002) * 1;
		masterCar.rotation.y = Math.cos(timeNow * 0.0026) * 0.025 + Math.sin(timeNow * 0.001) * 0.02;
		masterCar.rotation.x = Math.sin(timeNow * 0.0024) * 0.025;
	}

	for (var i = 0; i < allUniforms.length; i++)
		allUniforms[i].globalTime.value += deltaTime * 0.003;

	if (currentlyPressedKeys[87] || currentlyPressedKeys[38])
	{
		targetCamHeight += 0.2 * deltaTime;
		if (targetCamHeight > 240)
			targetCamHeight = 240;
	}
	if (currentlyPressedKeys[83] || currentlyPressedKeys[40])
	{
		targetCamHeight -= 0.2 * deltaTime;
		if (targetCamHeight < 100)
			targetCamHeight = 100;
	}

	if (currentlyPressedKeys[68] || currentlyPressedKeys[39])
	{
		targetCamRot -= 0.003 * deltaTime;
	}
	if (currentlyPressedKeys[65] || currentlyPressedKeys[37])
	{
		targetCamRot += 0.003 * deltaTime;
	}
	targetCamHeight += (170 - targetCamHeight) * 0.01;
	camHeight += (targetCamHeight - camHeight) * 0.1;
	camRot += (targetCamRot - camRot) * 0.1;

	var border = 1000;
	for (var i = 0; i < cars.length; i++)
	{
		var car = cars[i];
		if (!car.vel || ((car.x > border || car.x < -border || car.z > border || car.z < -border) && Math.random() > 0.96))
		{
			{
				if (Math.random() > 0.5) 
				{
					car.x = border;
					car.y = 30;
					car.body.rotation.y = 0;

					if (Math.random() > 0.5)
					{
						car.x = -border;
						car.y = 40;
						car.body.rotation.y = Math.PI;
					}

					car.z = Math.round(Math.random() * 5) * 200 - 500 + car.x / 50;
					car.vel = [-car.x / 10, 0, 0];
				}
				else
				{
					car.z = border;
					car.y = 10;
					car.body.rotation.y = -Math.PI / 2;

					if (Math.random() > 0.5)
					{
						car.z = -border;
						car.y = 20;
						car.body.rotation.y = Math.PI / 2;
					}

					car.x = Math.round(Math.random() * 5) * 200 - 500 + car.z / 50;
					car.vel = [0, 0, -car.z / 10];
				}
			}
		}
		else if (car.vel)
		{
			car.x += car.vel[0] * deltaTime * 0.0075;
			car.z += car.vel[2] * deltaTime * 0.0075;
		}

		if (!car.glow)
		{
			var geometry = new THREE.PlaneGeometry(80, 80, 1, 1);
			var mat = new THREE.MeshBasicMaterial({map: spark, 
				wireframe: 		false,
				color: new THREE.Color(1, 0.5, 0.25),
				depthWrite: 	false,
				side: 			THREE.DoubleSide});

			mat.blending = THREE.AdditiveBlending;
			mat.transparent = true;
			car.glow = new THREE.Mesh( geometry, mat );
			car.glow.rotation.x = Math.PI / 2;
			scene.add(car.glow);
		}
		car.glow.position.set(car.x, 5, car.z);

		car.body.position.set(car.x, car.y, car.z);
	}

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



var modelLoader = new THREE.GLTFLoader();

// Load a glTF resource
modelLoader.load(

	'models/futuristic_flying_car/scene.gltf',

	function ( gltf ) {

		gltf.scene.traverse( function ( child ) {
			if ( child.isMesh ) {
				// child.material.envMap = textureCube;	
			}
		});

		gltf.scene.scale.set(0.4, 0.4, 0.4);
		gltf.scene.position.y += 160;

		for (var i = 0; i < 49; i++)
		{
			var two = gltf.scene.clone();
			var car = { };
			car.body = two;
			cars.push(car);
			scene.add( two );
		}
		
		masterCar = gltf.scene;

		var lensflare = new THREE.Lensflare();
		var textureFlare1 = loader.load( "tex/gold.jpg" );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 200, 0 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 300, 0 ) );
		lensflare.position.set(-40, 6.5, 4.5)
		masterCar.add(lensflare);

		var lensflare = new THREE.Lensflare();
		var textureFlare1 = loader.load( "tex/gold.jpg" );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 200, 0 ) );
		lensflare.addElement( new THREE.LensflareElement( textureFlare1, 300, 0 ) );
		lensflare.position.set(-40, 6.5, -4.5)
		masterCar.add(lensflare);

		masterCar.scale.set(0.8, 0.8, 0.8);
		scene.add( gltf.scene );

		var geometry = new THREE.PlaneGeometry(120, 120, 1, 1);
		var mat = new THREE.MeshBasicMaterial({map: spark, 
			wireframe: 		false,
			color: new THREE.Color(1, 0.5, 0.25),
			depthWrite: 	false,
			side: 			THREE.DoubleSide});

		mat.blending = THREE.AdditiveBlending;
		mat.transparent = true;

		var glow = new THREE.Mesh( geometry, mat );
		glow.rotation.x = Math.PI / 2;
		glow.position.set(0, 0.5, 0);
		masterCar.add(glow);

/*
		var glow = new THREE.Mesh( geometry, mat );
		glow.rotation.x = Math.PI / 2;
		glow.position.set(0, 130, 0);
		scene.add(glow);


		var mat = new THREE.ShaderMaterial( {
			uniforms: 		newUniforms,
			vertexShader:   document.getElementById( 'beamvert' ).textContent,
			fragmentShader: document.getElementById( 'beamfrag' ).textContent,
			wireframe: 		false,
			side: 			THREE.DoubleSide,
		});
		mat.blending = THREE.AdditiveBlending;
		mat.depthWrite = false;
		mat.transparent = true;


		var geometry = new THREE.CylinderGeometry( 10, 10, 40, 32, 1, true );
		var cylinder = new THREE.Mesh( geometry, mat );
		cylinder.position.y = 140;
		scene.add( cylinder );

		loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

			console.log("You\'re ride is here!");
			var geometry = new THREE.TextGeometry( 'You\'re ride is here!', {
				font: font,
				size: 80,
				height: 5,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 10,
				bevelSize: 8,
				bevelSegments: 5
			} );
			var text = new THREE.Mesh( geometry, mat );
			text.position.y = 140;
			scene.add( text );
		} );
*/
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

