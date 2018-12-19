
function Bullet(x, y, owner, model, options)
{
	this.x = x;
	this.y = y;
	this.z = 0;
	this.sizeX = options.size;
	this.sizeY = this.sizeX;
	this.sizeZ = 1;

	this.xSpeed = options.xSpeed;
	this.ySpeed = options.ySpeed;

	this.model = model;
	scene.add( this.model );

	this.model.position.x = x;
	this.model.position.y = y;
	this.model.position.z = z;
}

Bullet.prototype.update = function(dTime)
{
	this.x += this.xSpeed;
	this.y += this.ySpeed;

	this.model.position.x = x;
	this.model.position.y = y;
	this.model.position.z = z;
}

Bullet.prototype.hide = function()
{	
	scene.remove(this.model);
}

Bullet.prototype.show = function()
{	
	scene.add(this.model);
}

Bullet.prototype.die = function()
{	
	scene.remove(this.model);
}