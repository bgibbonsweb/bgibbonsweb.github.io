
loader = new THREE.TextureLoader();
outlineTex = loader.load( "tex/outline.png" );
outlineAlpha = loader.load( "tex/A_outline.png" );

function SpawnZone(x, y, z, sizeX, sizeY)
{
	this.texName = "part1.jpg";
	var bodyMaterial = new THREE.MeshBasicMaterial( {
		map: outlineTex,
		color: 0x42f4ee,
		wireframe: false,
		transparent: true,
		opacity: 1,
		alphaMap: outlineAlpha,
	} );
	var geom = new THREE.PlaneGeometry(1, 1, 1, 1);
	this.mesh = new THREE.Mesh( geom, bodyMaterial );

	if (showEditorObjects)
		scene.add( this.mesh );

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z + 0.1;

	this.setSize(sizeX, sizeY);

	this.isSolid = false;
	this.isEditorObject = true;

	this.sizeZ = 1;

	this.objectType = "Player";
	this.spawnImmediate = true;
}

SpawnZone.prototype.setPosition = function(x, y, z)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

SpawnZone.prototype.setSize = function(sizeX, sizeY)
{	
	if (sizeX < 0)
		sizeX = -sizeX;
	if (sizeY < 0)
		sizeY = -sizeY;
	this.sizeX = sizeX;
	this.sizeY = sizeY;
	this.mesh.scale.set(sizeX, sizeY, 1);
}


SpawnZone.prototype.begin = function()
{
	console.log(this.spawnImmediate);
	if (this.spawnImmediate)
	{
		var newObj = new window[this.objectType](this.x, this.y, this.z);

		newObj.type = this.objectType;
		addGameObject(newObj);
		console.log(newObj);
	}
}

SpawnZone.prototype.update = function(dTime)
{	

}

SpawnZone.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

SpawnZone.prototype.show = function()
{	
	if (showEditorObjects)
	{
		console.log(this.x, this.y);
		scene.add(this.mesh);
		this.mesh.position.set(this.x, this.y, this.z + 0.1);
		this.mesh.scale.set(this.sizeX, this.sizeY, this.sizeZ);
	}
	else
		this.hide();
}

SpawnZone.prototype.die = function()
{	
	scene.remove(this.mesh);
}