
placeHolderMat = new THREE.MeshBasicMaterial( {
	color: 0xff5d00,
	wireframe: false,
	transparent: true,
	opacity: 1,
} );

function Fog(x, y, z, sizeX, sizeY)
{
	this.opacity = 1;
	this.texName = "glow.jpg";
	this.texName2 = "noise.jpg";

	var geometry = new THREE.PlaneGeometry( 1, 1 );
	var plane = new THREE.Mesh( geometry, placeHolderMat );
	this.color = new THREE.Color(1, 1, 1);

	this.mesh = plane;

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z;

	this.setSize(sizeX, sizeY);
	this.sizeZ = 1;
	this.fogSpeed = 1000;
}

Fog.prototype.setPosition = function(x, y)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
	this.mesh.position.z = this.z;
}

Fog.prototype.setSize = function(sizeX, sizeY)
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

Fog.prototype.update = function(dTime)
{	
	if (this.uniforms)
		this.uniforms.globalTime.value += dTime * this.fogSpeed / 10000.0;
}

Fog.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

Fog.prototype.show = function()
{	
	var tex = loader.load( "tex/" + this.texName );
	tex.magFilter = THREE.NearestFilter;

	var tex2 = loader.load( "tex/" + this.texName2 );
	tex2.magFilter = THREE.NearestFilter;
	tex2.wrapS = THREE.RepeatWrapping;
	tex2.wrapT = THREE.RepeatWrapping;

	this.uniforms  = {
		texture1:    { type: "t", value: tex },
		texture2:    { type: "t", value: tex2 },
		globalTime:	{ type: "f", value: 1000 * Math.random() },
		color: { type: "v3", value: new THREE.Vector3(this.color.r, this.color.g, this.color.b) }, 
	};

	var mat = new THREE.ShaderMaterial( {
		uniforms: 		this.uniforms,
		vertexShader:   document.getElementById( 'fog2vert' ).textContent,
		fragmentShader: document.getElementById( 'fog2frag' ).textContent,
		wireframe: 		false,
		side: 			THREE.DoubleSide,
		opacity: 		1.0,
	});

	mat.transparent = true;
	mat.depthWrite = false;
	mat.depthRead = false;
	mat.DoubleSide = true;
	mat.blending = THREE.AdditiveBlending;

	this.mesh.material = mat;

	scene.add( this.mesh );
}

Fog.prototype.die = function()
{	
	scene.remove(this.mesh);
}