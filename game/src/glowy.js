
loader = new THREE.TextureLoader();
placeHolderTex = loader.load( "tex/road.jpg" );

function Glowy(x, y, z, sizeX, sizeY)
{
	this.opacity = 1.0;
	this.texName = "halo.jpg";
	var material = new THREE.MeshBasicMaterial( {map: placeHolderTex, side: THREE.DoubleSide, transparent: true, opacity: 1} );
	material.transparent = true;
	var geometry = new THREE.PlaneGeometry( 1, 1 );
	var plane = new THREE.Mesh( geometry, material );

	scene.add( plane );

	this.mesh = plane;
	this.color = new THREE.Color(1, 1, 1);
	this.threshold = 500;
	this.swing = 500;

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z;

	this.setSize(sizeX, sizeY);
	this.sizeZ = 1;
}

Glowy.prototype.setPosition = function(x, y)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

Glowy.prototype.setSize = function(sizeX, sizeY)
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

Glowy.prototype.update = function(dTime)
{	
	if (Math.random() > this.threshold / 1000.0)
	{
		var mult = (1.0 - this.swing / 2000.0) + Math.random() * this.swing / 1000.0;
		this.mesh.material.color = new THREE.Color(this.color.r * mult, this.color.g * mult, this.color.b * mult);
	}
}

Glowy.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

Glowy.prototype.show = function()
{	
	var tex = loader.load( "tex/" + this.texName );
	tex.magFilter = THREE.NearestFilter;

	this.mesh.material.color = this.color;
	this.mesh.material.map = tex;

	this.mesh.material.blending = THREE.AdditiveBlending;
	this.mesh.material.depthWrite = false;
	this.mesh.material.depthRead = true;
	this.mesh.material.opacity = this.opacity;

	scene.add(this.mesh);
	this.mesh.position.set(this.x, this.y, this.z);
	this.mesh.scale.set(this.sizeX, this.sizeY, this.sizeZ);
}

Glowy.prototype.die = function()
{	
	scene.remove(this.mesh);
}