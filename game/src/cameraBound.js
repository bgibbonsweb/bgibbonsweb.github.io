
loader = new THREE.TextureLoader();
outlineTex = loader.load( "tex/outline.png" );
outlineAlpha = loader.load( "tex/A_outline.png" );

var camBoundLeft = 0;
var camBoundRight = 0;
var camBoundTop = 0;
var camBoundBottom = 0;

function CameraBound(x, y, z, sizeX, sizeY)
{
	var bodyMaterial = new THREE.MeshBasicMaterial( {
		map: outlineTex,
		color: 0x4286f4,
		wireframe: false,
		transparent: true,
		opacity: 1,
		alphaMap: outlineAlpha,
	} );
	var geom = new THREE.PlaneGeometry(1, 1, 1, 1);
	this.mesh = new THREE.Mesh( geom, bodyMaterial );
	scene.add( this.mesh );

	this.setPosition(x, y);
	this.z = z;
	this.mesh.position.z = z + 0.1;

	this.setSize(sizeX, sizeY);

	this.isSolid = false;
	this.isEditorObject = true;

	this.sizeZ = 1;

	this.boundRight = false;
	this.boundLeft = false;
	this.boundTop = false;
	this.boundBottom = false;
}

CameraBound.prototype.setPosition = function(x, y, z)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

CameraBound.prototype.setSize = function(sizeX, sizeY)
{	
	if (sizeX < 0)
		sizeX = -sizeX;
	if (sizeY < 0)
		sizeY = -sizeY;
	this.sizeX = sizeX;
	this.sizeY = sizeY;
	this.mesh.scale.set(sizeX, sizeY, 1);
}

CameraBound.prototype.update = function(dTime)
{	

}

CameraBound.prototype.hide = function()
{	
	scene.remove(this.mesh);
}

CameraBound.prototype.show = function()
{	
	if (this.boundLeft)
		camBoundLeft = this.x + this.sizeX / 2;
	if (this.boundRight)
		camBoundRight = this.x - this.sizeX / 2;

	if (this.boundTop)
		camBoundTop = this.y - this.sizeY / 2;
	if (this.boundBottom)
		camBoundBottom = this.y + this.sizeY / 2;

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

CameraBound.prototype.die = function()
{	
	scene.remove(this.mesh);
}