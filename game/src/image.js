
loader = new THREE.TextureLoader();
placeHolderTex = loader.load( "tex/road.jpg" );

function Image(x, y, z, sizeX, sizeY)
{
	this.opacity = 1;
	this.texName = "road.jpg";
	var material = new THREE.MeshBasicMaterial( {map: placeHolderTex, side: THREE.DoubleSide, transparent: true, opacity: 1} );
	material.transparent = true;
	var geometry = new THREE.PlaneGeometry( 1, 1 );
	var plane = new THREE.Mesh( geometry, material );

	scene.add( plane );

	this.mesh = plane;
	this.color = new THREE.Color(1, 1, 1);

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z;

	this.setSize(sizeX, sizeY);
	this.sizeZ = 1;
	this.blendAdditive = false;
}

Image.prototype.setPosition = function(x, y)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

Image.prototype.setSize = function(sizeX, sizeY)
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

Image.prototype.update = function(dTime)
{	

}

Image.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

Image.prototype.show = function()
{	
	var tex = loader.load( "tex/" + this.texName );
	tex.magFilter = THREE.NearestFilter;

	this.mesh.material.color = this.color;
	this.mesh.material.map = tex;

	this.mesh.material.blending = this.blendAdditive ? THREE.AdditiveBlending : THREE.NormalBlending; 
	this.mesh.material.depthWrite = !this.blendAdditive;
	this.mesh.material.opacity = this.opacity;

	scene.add(this.mesh);
	this.mesh.position.set(this.x, this.y, this.z);
	this.mesh.scale.set(this.sizeX, this.sizeY, this.sizeZ);
}

Image.prototype.die = function()
{	
	scene.remove(this.mesh);
}