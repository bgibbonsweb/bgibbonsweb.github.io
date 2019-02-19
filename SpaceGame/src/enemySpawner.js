
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
	enemy.collisionDamage = 20 * difficulty;

	enemy.life = 20 + 40 * difficulty;
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
	enemy.gun.damage = 7 * difficulty;
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