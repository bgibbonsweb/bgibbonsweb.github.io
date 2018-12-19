
function Player(x, y, z)
{
	this.team = 1;
	this.life = 100;
	this.damageTime = 0;

	this.x = x;
	this.y = y;
	this.z = z;
	this.sizeX = 40;
	this.sizeY = this.sizeX;
	this.sizeZ = 1;

	this.xSpeed = 0;
	this.ySpeed = 0;

	this.hasDashTimer = 0;
	this.dashTimer = 0;
	this.extraJumps = 0;

	var geometry = new THREE.SphereGeometry( this.sizeX * 0.5, 32, 32 );

	var bodyMaterial = new THREE.MeshBasicMaterial( {
		color: 0xffffff,
		wireframe: false,
	} );

	this.model = new THREE.Mesh( geometry, bodyMaterial );
	scene.add( this.model );

	this.model.position.x = x;
	this.model.position.y = y;
	this.model.position.z = z;
	this.facingRight = true;

	this.upKey = [87, 38];
	this.downKey = [83, 40];
	this.leftKey = [65, 37];
	this.rightKey = [68, 39];
	this.dashKey = 32;

	this.dashSpeed = 0.5;
	this.speed = 0.15;
	this.jumpSpeed = 0.5;
	this.gravity = 0.0015;
	this.xDrag = 0.010;
}

Player.prototype.hit = function(damage)
{
	if (this.damageTime <= 0)
	{
		this.damageTime = 1000;
		this.life -= damage;
		if (this.life <= 0)
			killObject(this);
	}
}

Player.prototype.moveBy = function(rot, dTime, speed, ignoreWalls)
{
	var moveSpeed = dTime * speed;
	var xAmount = Math.cos(rot) * moveSpeed;
	var yAmount = Math.sin(rot) * moveSpeed;

	while (true)
	{
		if (ignoreWalls || !isObject(this.x - this.sizeX / 2 + xAmount, this.x + this.sizeX / 2 + xAmount,
			this.y - this.sizeY / 2, this.y + this.sizeY / 2
			, solidGameObjects))
		{
			this.x += xAmount;
			break;
		}
		if (xAmount > 0)
		{
			xAmount -= 4;
			if (xAmount <= 0)
				break;
		}
		else
		{
			xAmount += 4;
			if (xAmount >= 0)
				break;
		}
	}

	while (true)
	{
		if (ignoreWalls || !isObject(this.x - this.sizeX / 2, this.x + this.sizeX / 2,
			this.y - this.sizeY / 2 + yAmount, this.y + this.sizeY / 2 + yAmount
			, solidGameObjects))
		{
			this.y += yAmount;
			break;
		}

		if (yAmount > 0)
		{
			yAmount -= 4;
			if (yAmount <= 0)
				break;
		}
		else
		{
			yAmount += 4;
			if (yAmount >= 0)
				break;
		}
	}
}


Player.prototype.updateDash = function(dTime)
{
	this.dashTimer -= dTime;
	this.ySpeed = Math.sin(this.dashRot) * this.dashSpeed * 0.25;
	this.xSpeed = -Math.cos(this.dashRot) * this.dashSpeed;
	this.moveBy(this.dashRot, dTime, this.dashSpeed, true);
	if (this.dashTimer <= 0 && isObject(this.x - this.sizeX / 2, this.x + this.sizeX / 2,
		this.y - this.sizeY / 2, this.y + this.sizeY / 2
		, solidGameObjects))
	{
		this.dashTimer = 1;
	}
}

Player.prototype.updateDamageTimer = function(dTime)
{
	this.damageTime -= dTime;

	this.xSpeed = 0;
	this.ySpeed = 0;

	if (this.facingRight)
		this.moveBy(Math.PI, dTime, 0.01);
	else
		this.moveBy(0, dTime, 0.01);
}

Player.prototype.isKeyPressed = function(keys, keySet)
{
	if (!keySet)
		keySet = currentlyPressedKeys;
	
	for (var i = 0; i < keys.length; i++)
	{
		if (keySet[keys[i]])
			return true;
	}
	return false;
}

Player.prototype.startDash = function(dTime)
{
	this.hasDashTimer = 0;
	this.dashTimer = 200;
	this.extraJumps = 2;
	this.rot = 0;
	this.dashRot = this.facingRight ? 0 : Math.PI;

	if (this.isKeyPressed(this.upKey))
	{
		if (this.isKeyPressed(this.rightKey))
			this.dashRot = Math.PI / 4;
		else if (this.isKeyPressed(this.leftKey))
			this.dashRot = Math.PI * 3 / 4;
		else
			this.dashRot = Math.PI / 2;
	}
	else if (this.isKeyPressed(this.downKey))
	{
		if (this.isKeyPressed(this.rightKey))
			this.dashRot = -Math.PI / 4;
		else if (this.isKeyPressed(this.leftKey))
			this.dashRot = -Math.PI * 3 / 4;
		else
			this.dashRot = -Math.PI / 2;
	}
	else if (this.isKeyPressed(this.leftKey))
		this.dashRot = Math.PI;
	else if (this.isKeyPressed(this.leftKey))
		this.dashRot = 0;
}

Player.prototype.update = function(dTime)
{	
	this.ignoreHit = false;

	if (this.dashTimer > 0)
	{	
		this.updateDash(dTime);
	}
	else
	{
		this.hasDashTimer += dTime;

		if (this.damageTime > 0)
		{
			this.updateDamageTimer(dTime);
		}
		else
		{
			var xDrag = this.xDrag * dTime;
			if (Math.abs(this.xSpeed) < xDrag)
				this.xSpeed = 0;
			else
			{
				if (this.xSpeed > 0)
					this.xSpeed -= xDrag;
				else
					this.xSpeed += xDrag;

				this.moveBy(Math.PI, dTime, this.xSpeed);
			}

			var yOffset = -4 - Math.abs(this.ySpeed * dTime);

			var blockAbove = isObject(this.x - this.sizeX / 2, this.x + this.sizeX / 2,
					this.y - this.sizeY / 2 - yOffset, this.y + this.sizeY / 2 - yOffset
					, solidGameObjects);

			var blockUnder = isObject(this.x - this.sizeX / 2, this.x + this.sizeX / 2,
					this.y - this.sizeY / 2 + yOffset, this.y + this.sizeY / 2 + yOffset
					, solidGameObjects);
			
			if (blockAbove && blockUnder != blockAbove && this.ySpeed > 0)
			{
				if (this.ySpeed > 0)
					this.ySpeed = 0;
				var minY = blockAbove.y - (blockAbove.sizeY + this.sizeY) / 2 - 0.001;
				this.y = minY;
			}

			if (blockUnder && (blockUnder === blockAbove || !blockAbove) && this.ySpeed < 0)
			{
				if (this.ySpeed < 0)
					this.ySpeed = 0;
				var maxY = blockUnder.y + (blockUnder.sizeY + this.sizeY) / 2 + 0.001;
				this.y = maxY;
			}
			else
			{
				this.ySpeed -= this.gravity * dTime;
			} 

			// space
			if (currentlyPressedKeys[32] && this.hasDashTimer > 2000)
			{
				// disable for now
				// this.startDash();
			}

			var leftPressed = this.isKeyPressed(this.leftKey);
			var rightPressed = this.isKeyPressed(this.rightKey);

			// left
			if (leftPressed)
			{
				this.moveBy(Math.PI, dTime, this.speed);
				this.facingRight = false;
			}
			// right
			if (rightPressed)
			{
				this.moveBy(0, dTime, this.speed);
				this.facingRight = true;
			}

			var xOffset = 0.2;
			var blockRight = isObject(this.x - this.sizeX / 2 + xOffset, this.x + this.sizeX / 2 + xOffset,
				this.y - this.sizeY / 2, this.y + this.sizeY / 2
				, solidGameObjects);
			var blockLeft = isObject(this.x - this.sizeX / 2 - xOffset, this.x + this.sizeX / 2 - xOffset,
				this.y - this.sizeY / 2, this.y + this.sizeY / 2
				, solidGameObjects);

			// up
			if (this.isKeyPressed(this.upKey) && !this.isKeyPressed(this.upKey, previouslyPressedKeys))
			{
				if (blockUnder || this.extraJumps > 0)
				{
					if (!blockUnder)
						this.extraJumps--;
					else
						this.extraJumps = 2;

					this.ySpeed = this.jumpSpeed;
				}
			}


			this.y += this.ySpeed * dTime;

		}
	}

	this.model.position.x = this.x;
	this.model.position.y = this.y;
	this.model.position.z = this.z;

	camera.position.x = this.x;
	camera.position.y = this.y;
	camera.position.z = 360;

	var bufferW = camera.position.z * 0;
	var bufferH = camera.position.z * 0;
	if (camBoundLeft != 0 && camera.position.x < camBoundLeft + bufferW)
		camera.position.x = camBoundLeft + bufferW;
	if (camBoundRight != 0 && camera.position.x > camBoundRight - bufferW)
		camera.position.x = camBoundRight - bufferW;

	if (camBoundBottom != 0 && camera.position.y < camBoundBottom + bufferH)
		camera.position.y = camBoundBottom + bufferH;
	if (camBoundTop != 0 && camera.position.y > camBoundTop - bufferH)
		camera.position.y = camBoundTop - bufferH;

}

Player.prototype.hide = function()
{	
	scene.remove(this.model);
}

Player.prototype.show = function()
{	
	scene.add(this.model);
}

Player.prototype.die = function()
{	
	scene.remove(this.model);
}