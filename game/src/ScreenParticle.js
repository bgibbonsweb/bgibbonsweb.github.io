
loader = new THREE.TextureLoader();
outlineTex = loader.load( "tex/outline.png" );
outlineAlpha = loader.load( "tex/A_outline.png" );

function ScreenParticle(x, y, z, sizeX, sizeY)
{	
	var bodyMaterial = new THREE.MeshBasicMaterial( {
		map: outlineTex,
		color: 0x0995f9,
		wireframe: false,
		transparent: true,
		opacity: 1,
		alphaMap: outlineAlpha,
	} );

	var geom = new THREE.PlaneGeometry(1, 1, 1, 1);
	this.mesh = new THREE.Mesh( geom, bodyMaterial );
	if (showEditorObjects)
		scene.add( this.mesh );

	this.system = null;

	this.isScreen = false;
	this.setPosition(x, y);
	this.z = z;

	this.setSize(sizeX, sizeY);

	this.isSolid = false;
	this.sizeZ = 1;
	this.maxParticles = 1000;
	this.texName = "part1.png";
	this.blendAdditive = false;
	this.isEditorObject = true;
	this.fade = false;

	this.options = {
		position: new THREE.Vector3(),
		positionRandomness: 0.0,
		velocity: new THREE.Vector3(),
		velocityRandomness: 0.0,
		color: 0xffffff,
		colorRandomness: 0.0,
		turbulence: .0,
		lifetime: 100,
		size: 20,
		sizeRandomness: 0,
	};

	this.spawnRate = 100;
	this.velocityRandomness = 0;
	this.color = new THREE.Color(1, 1, 1);
	this.colorRandomness = 0;
	this.turbulence = 0;
	this.lifetime = 100;
	this.size = 200;
	this.sizeRandomness = 0;

	this.speedX = 0;
	this.speedY = 0;

	this.dontEditThisTime = 0;
	this.timeAlive = 0;
}

ScreenParticle.prototype.setPosition = function(x, y, z)
{	
	this.x = x;
	this.y = y;
	this.mesh.position.x = x;
	this.mesh.position.y = y;
}

ScreenParticle.prototype.setSize = function(sizeX, sizeY)
{	
	if (sizeX < 0)
		sizeX = -sizeX;
	if (sizeY < 0)
		sizeY = -sizeY;
	this.sizeX = sizeX;
	this.sizeY = sizeY;
	this.mesh.scale.set(sizeX, sizeY, 1);
}

ScreenParticle.prototype.update = function(dTime)
{	
	if (this.spawnRate < 4)
		this.spawnRate = 4;

	this.dontEditThisTime += dTime;
	this.timeAlive += dTime / 100.0;
	while (this.dontEditThisTime > this.spawnRate)
	{
		this.dontEditThisTime -= this.spawnRate;
		this.options.position.x = this.x + this.sizeX * (Math.random() - 0.5);
		this.options.position.y = this.y + this.sizeY * (Math.random() - 0.5);

		if (this.isScreen)
		{
			this.options.position.x += camera.position.x;
			this.options.position.y += camera.position.y;
		}

		this.options.position.z = this.z;

		this.options.velocity.x = this.speedX / 1000.0 + (Math.random() - 0.5) * this.velocityRandomness / 100.0;
		this.options.velocity.y = this.speedY / 1000.0 + (Math.random() - 0.5) * this.velocityRandomness / 100.0;

		if (this.system)
			this.system.spawnParticle( this.options );
	}

	this.system.update(this.timeAlive);
}

ScreenParticle.prototype.hide = function()
{	
	if (this.system)
		scene.remove(this.system);
	scene.remove(this.mesh);

	this.system = null;
}

ScreenParticle.prototype.show = function()
{	
	if (this.system)
		scene.remove(this.system);

	var tex = loader.load( "tex/" + this.texName );
	tex.magFilter = THREE.NearestFilter;
	
	this.system = new THREE.GPUParticleSystem( {
		maxParticles: this.maxParticles,
		particleSpriteTex: tex
	}, this.blendAdditive, this.fade );

	scene.add( this.system );

	if (showEditorObjects)
	{
		scene.add(this.mesh);
		this.mesh.position.set(this.x, this.y, this.z + 0.1);
		this.mesh.scale.set(this.sizeX, this.sizeY, this.sizeZ);
	}
	else
		scene.remove(this.mesh);

	this.options.color = this.color;
	this.options.colrRandomness = this.colorRandomness;
	this.options.turbulence = this.turbulence;
	this.options.lifetime = this.lifetime / 100.0;
	this.options.size = this.size / 10.0;
	this.options.sizeRandomness = this.sizeRandomness / 1000.0;

	this.options.velocity.x = this.speedX;
	this.options.velocity.y = this.speedY;
}

ScreenParticle.prototype.die = function()
{	
	if (this.system)
		scene.add( this.system );
	scene.remove(this.mesh);
	this.system = null;
}