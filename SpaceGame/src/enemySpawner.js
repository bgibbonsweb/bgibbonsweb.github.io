
function SpawnAsteroid(x, y, z, size)
{
	let enemy = new Enemy();
	enemy.pos.x = x;
	enemy.pos.y = y;
	enemy.pos.z = z;

	size *= 2;
	enemy.size.x = size;
	enemy.size.y = size;
	enemy.size.z = size;

	enemy.spinX = 0.001;
	enemy.spinY = 0.001;
	
	enemy.update2 = function(dTime) { 
		this.maxSpeed = currentLevel.speed;
		this.model.rotation.x += this.spinX * dTime;
		this.model.rotation.y += this.spinY * dTime;
	}

	enemy.life = 10 + 50 * difficulty;
	if (enemy.life > 170)
		enemy.life = 170;
	
	currentLevel.addShipObj(enemy);

	material =  new THREE.MeshPhongMaterial( {
		specular:  		0x111111,
		map: loader.load("tex/asteroid.jpg"),
		bumpScale: 20,
		emissive: 		0x000000,
		color: 			0x000000,
		wireframe: 		false,
	});
	var geometry = new THREE.SphereGeometry( size / 2 , 16, 16 );
	var sphere = new THREE.Mesh( geometry, material );
	sphere.scale.x = 0;
	sphere.position.y = -10000;
	enemy.model = sphere;
	scene.add(sphere);

	return enemy;
}

function SpawnDeathWall()
{	
	var doX = Math.random() > 0.5;
	var x = 0;
	var z = 0;
	if (doX)
		x = 600;
	else
		z = 600;

	if (Math.random() > 0.5)
	{
		x = -x;
		z = -z;
	}

	var deathWall = new DeathWall(x, z, doX);
	currentLevel.addGameObj(deathWall);
}

function SpawnDiver(x, y, z)
{
	let enemy = new Enemy();
	enemy.pos.x = x;
	enemy.pos.y = y;
	enemy.pos.z = z;

	var size = 60;
	enemy.size.x = size;
	enemy.size.y = size;
	enemy.size.z = size;
	enemy.accel = 0.3;
	
	enemy.maxSpeed = 1;
	enemy.update2 = function(dTime) {
		if (this.pos.y > -1200 || this.pos.y < -2000)
			this.maxSpeed = 20;
		else
			this.maxSpeed = this.parent.speed / 2;
	} 
	
	currentLevel.addShipObj(enemy);

	modelLoader.load(

		'models/star_viper_free/scene.gltf',

		function ( gltf ) {

			shipReflective = 0.5;
			gltf.scene.traverse( function ( child ) {
				if ( child.isMesh ) {

					child.material =  new THREE.MeshPhongMaterial( {

						envMap: 		textureCube,
						reflectivity:   shipReflective,
						specular:  		0xffffff,

						emissive: 		0xff0000,
						normalMap: 		child.material.normalMap,
						aoMap: 			child.material.aoMap,
						color: 			0xffffff,
						wireframe: 		false,
					});
					child.rotation.y = -Math.PI / 2;

				}
			});


			enemy.model = gltf.scene;
			scene.add( enemy.model );
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

	return enemy;
}


function SpawnShooter(x, y, z)
{
	let enemy = new Enemy();
	enemy.pos.x = x;
	enemy.pos.y = y;
	enemy.pos.z = z;
	enemy.gun = new Gun(enemy);
	enemy.gun.damage = 3 * difficulty * (difficulty + 1);
	enemy.gun.maxRof = 2700 + Math.random() * 1000 - 200 * difficulty;
	enemy.gun.rof = 4400 - 175 * difficulty;

	var size = 400;
	enemy.size.x = size;
	enemy.size.y = size;
	enemy.size.z = size;
	enemy.accel = 0.3;
	enemy.life = 50;
	enemy.useDeathDrop = true;

	enemy.maxSpeed = 1;
	enemy.update2 = function(dTime) {
		if (this.pos.y < -4000)
			this.maxSpeed = this.parent.speed * 4;
		else 
			this.maxSpeed = 0;
	} 
	
	currentLevel.addShipObj(enemy);

	material =  new THREE.MeshPhongMaterial( {
		specular:  		0x111111,
		map: loader.load("tex/asteroid.jpg"),
		bumpScale: 20,
		emissive: 		0x000000,
		color: 			0x000000,
		wireframe: 		false,
	});
	var geometry = new THREE.CubeGeometry( size , size, size );
	var sphere = new THREE.Mesh( geometry, material );
	sphere.scale.x = 0;
	sphere.position.y = -10000;
	enemy.model = sphere;
	scene.add(sphere);

	return enemy;
}

function SpawnShooter2(x, y, z)
{
	let enemy = new Enemy();
	enemy.pos.x = x;
	enemy.pos.y = y;
	enemy.pos.z = z;
	enemy.gun = new Gun(enemy);
	enemy.gun.damage = 3 * difficulty * (difficulty + 1);
	enemy.gun.maxRof = 700 + Math.random() * 1000 - 100 * difficulty;
	enemy.gun.maxClipTime = 3500 - 300 * difficulty;
	enemy.gun.maxClipSize = 3 * difficulty;
	enemy.gun.rof = 4400 - 175 * difficulty;

	var size = 400;
	enemy.size.x = size;
	enemy.size.y = size;
	enemy.size.z = size;
	enemy.accel = 0.3;
	enemy.life = 45 + difficulty * 5;
	enemy.useDeathDrop = true;
	enemy.modelMult = 5;

	enemy.maxSpeed = 1;
	enemy.update2 = function(dTime) {
		if (this.pos.y < -4000)
			this.maxSpeed = this.parent.speed * 4;
		else 
			this.maxSpeed = 0;
	} 
	
	currentLevel.addShipObj(enemy);

	modelLoader.load(

		'models/star_viper_free/scene.gltf',

		function ( gltf ) {

			shipReflective = 0.5;
			gltf.scene.traverse( function ( child ) {
				if ( child.isMesh ) {

					child.material =  new THREE.MeshPhongMaterial( {

						envMap: 		textureCube,
						reflectivity:   shipReflective,
						specular:  		0xffffff,

						emissive: 		0xff0000,
						normalMap: 		child.material.normalMap,
						aoMap: 			child.material.aoMap,
						color: 			0xffffff,
						wireframe: 		false,
					});
					child.rotation.y = -Math.PI / 2;
				}
			});


			if (!enemy.isDead)
			{
				enemy.model = gltf.scene;
				scene.add( enemy.model );
			}
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

	enemy.getBullet = function(bullet) {

		var newPos = this.pos.clone();
		newPos.y += this.size.y / 2;
		bullet.pos = newPos;

		bullet.speed = new THREE.Vector3(thePlayer.pos.x - newPos.x, thePlayer.pos.y - newPos.y, thePlayer.pos.z - newPos.z);
		bullet.speed.x = Math.random() - 0.5;
		bullet.speed.y = Math.random() - 0.5;
		bullet.speed.z = Math.random() - 0.5;
		bullet.speed.setLength(45);

		bullet.size = 50;
		bullet.lifeTime = 16000;

		bullet.size = 60;
		
		var tex = loader.load( "tex/part1.png" );

		tex.magFilter = THREE.NearestFilter;
		var material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide, transparent: true, opacity: 1} );
		material.color = new THREE.Color(6, 1, 1);
		material.blending = THREE.AdditiveBlending;
		material.depthWrite = false;

		var geometry = new THREE.PlaneGeometry( 1, 1 );
		var plane = new THREE.Mesh( geometry, material );
		plane.rotation.x += Math.PI / 2;
		plane.scale.set(200, 200, 1);

		material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide, transparent: true, opacity: 1} );
		material.color = new THREE.Color(6, 0, 0);
		material.blending = THREE.AdditiveBlending;
		material.depthWrite = false;


		var plane2 = new THREE.Mesh( geometry, material );
		plane2.rotation.x += Math.PI / 2;
		plane2.scale.set(4, 200, 200);

		plane.add( plane2 );
		scene.add( plane );

		bullet.model = plane;

		if (this.getBullet2)
			this.getBullet2(bullet);

		bullet.update2 = function(dTime) {

			var diffMult = difficulty * (difficulty + 1) * 0.25;
			var mult = 0.005 * diffMult;
			if (bullet.pos.y < thePlayer.pos.y) 
			{
				bullet.speed.x += (thePlayer.pos.x - newPos.x) * mult;
				bullet.speed.y += (thePlayer.pos.y - newPos.y) * mult;
				bullet.speed.z += (thePlayer.pos.z - newPos.z) * mult;
				bullet.speed.setLength(45 * diffMult);
			}

			options.positionRandomness = 0.1;
			options.velocityRandomness = 0.001;
			options.velocity.x = 0;
			options.velocity.z = 0;
			options.colorRandomness = 0.1;
			options.lifetime = 600;
			options.turbulence = 0;

			options.position.x = this.pos.x;
			options.position.y = this.pos.y;
			options.position.z = this.pos.z;

			options.color = new THREE.Color(1, 0.2, 0.2);
			options.size = 40 + 40 * Math.random();
			cloudParticleSystem.spawnParticle( options );

			options.positionRandomness = 100;
			options.size = 10 + 10 * Math.random();
			cloudParticleSystem.spawnParticle( options );
		}	
		
	}

	return enemy;
}

function SpawnStrafer(x, y, z)
{
	let enemy = new Enemy();
	enemy.pos.x = x;
	enemy.pos.y = y;
	enemy.pos.z = z;
	enemy.gun = new Gun(enemy);
	enemy.gun.maxRof = 1000;

	var size = 60;
	enemy.size.x = size;
	enemy.size.y = size;
	enemy.size.z = size;
	enemy.accel = 0.3;
	
	enemy.maxSpeed = 1;
	enemy.update2 = function(dTime) {
		if (this.pos.y < -2000)
			this.maxSpeed = 20;
		else
			this.maxSpeed = 0.5;
	} 

	enemy.getSpeedTarget = function() {

		if (this.pos.y < -2000)
		{
			this.speedAdd.y = 1;
			return;
		}

		this.speedAdd.x = 1;
		if (this.timeAlive % 5000 > 2500)
			this.speedAdd.x = -1;

	}
	
	currentLevel.addShipObj(enemy);

	modelLoader.load(

		'models/star_viper_free/scene.gltf',

		function ( gltf ) {

			shipReflective = 0.5;
			gltf.scene.traverse( function ( child ) {
				if ( child.isMesh ) {

					child.material =  new THREE.MeshPhongMaterial( {

						envMap: 		textureCube,
						emissive: 		0xff0000,
						reflectivity:   shipReflective,
						specular:  		0xffffff,

						normalMap: 		child.material.normalMap,
						aoMap: 			child.material.aoMap,
						color: 			0xffffff,
						wireframe: 		false,
					});
					child.rotation.y = -Math.PI / 2;

				}
			});


			enemy.model = gltf.scene;
			scene.add( enemy.model );
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

	return enemy;
}