
placeHolderMat = new THREE.MeshBasicMaterial( {
	color: 0xff5d00,
	wireframe: false,
	transparent: true,
	opacity: 1,
} );

function FrontFog(x, y, z, sizeX, sizeY)
{
	this.opacity = 1;
	this.texName = "front.jpg";
	this.texName2 = "noise.jpg";

	var geometry = new THREE.PlaneGeometry( 1, 1 );
	var plane = new THREE.Mesh( geometry, placeHolderMat );
	scene.add( plane );

	this.mesh = plane;

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z;

	this.setSize(sizeX, sizeY);
	this.sizeZ = 1;
	this.fogSpeed = 1000;
}

FrontFog.prototype.setPosition = function(x, y)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

FrontFog.prototype.setSize = function(sizeX, sizeY)
{	
	if (sizeX < 0)
		sizeX = -sizeX;
	if (sizeY < 0)
		sizeY = -sizeY;
	this.sizeX = sizeX;
	this.sizeY = sizeY;
	this.mesh.scale.set(sizeX, sizeY, 1);
	this.isSolid = false;
}

FrontFog.prototype.update = function(dTime)
{	
	if (this.uniforms)
	{
		this.uniforms.globalTime.value += dTime * this.fogSpeed / 10000.0;
		this.mesh.position.x = camera.position.x;
		this.mesh.position.y = camera.position.y;
		this.uniforms.offset.value.x = camera.position.x / window.innerWidth * 1.5;
		this.uniforms.offset.value.y = camera.position.y / window.innerHeight * 1.5;
	}
}

FrontFog.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

FrontFog.prototype.show = function()
{	
	var tex = loader.load( "tex/" + this.texName );
	tex.magFilter = THREE.NearestFilter;

	var tex2 = loader.load( "tex/" + this.texName2 );
	tex2.magFilter = THREE.NearestFilter;
	tex2.wrapS = THREE.RepeatWrapping;
	tex2.wrapT = THREE.RepeatWrapping;


	this.uniforms = {
		texture1:    { type: "t", value: tex },
		texture2:    { type: "t", value: tex2 },
		offset:    { type: "v2", value: new THREE.Vector2() },
		globalTime:	{ type: "f", value: 1000 * Math.random() },
	};

	var mat = new THREE.ShaderMaterial( {
		uniforms: 		this.uniforms,
		vertexShader:   document.getElementById( 'fogvert' ).textContent,
		fragmentShader: document.getElementById( 'fogfrag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
	});

	mat.transparent = true;
	mat.depthWrite = false;
	mat.depthRead = false;
	mat.DoubleSide = true;
	mat.blending = THREE.AdditiveBlending;

	this.mesh.material = mat;

	scene.add( this.mesh );
}

FrontFog.prototype.die = function()
{	
	scene.remove(this.mesh);
}