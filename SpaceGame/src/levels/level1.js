

function MakeLevel1() {

	var lvl = new Level();
	lvl.timer1 = 0;
	lvl.timer2 = 0;
	lvl.timer3 = 0;
	lvl.powerupTimer = 0;

	lvl.speed = 0;
	lvl.targetSpeed = 2;
	lvl.phase = 0;

	lvl.begin = function() {

		this.makeClouds();
		this.addEvent(function() { lvl.targetSpeed = 5 + difficulty }, 5000);
		// this.addEvent(function() { lvl.targetSpeed = 3 }, 5001);

		this.addShipObj(this.player = new Player());
		this.player.inv = 0;
		this.addGameObj(new DeathWave(this.player.pos.x, this.player.pos.y, this.player.pos.z, 400, 0.00075));
		lives = 3;
	}

	lvl.update2 = function(dTime) {

		if (difficulty == 0)
			return;

		this.timer1 += dTime * this.speed;
		this.timer2 += dTime;
		this.timer3 += dTime;


		if (this.phase == 1)
		{
			if (this.timer2 > 8 * 1000)
			{
				this.leaveAllEnemies();
				this.timer2 -= 8 * 1000;
			}
		}
		else
		{
			this.timer2 = 0;
		}

		lvl.powerupTimer += dTime;
		if (lvl.powerupTimer > 35 * 1000)
		{
			lvl.powerupTimer -= 35 * 1000;

			var x = -(this.player.moveBorder) * (Math.random() * 2 - 1);
			var y = -(this.player.moveBorder) * (Math.random() * 2 - 1);
			this.addGameObj(new Powerup(x, -8000, y, Math.random() > 0.5 ? 0 : 1));
		}

		if (this.timer3 > 20 * 1000)
		{
			this.leaveAllEnemies();
			this.timer3 -= 20 * 1000;
			this.phase = 1 - this.phase;
		}

		if (this.timer1 > 0)
		{
			if (this.phase == 0)
				this.timer1 -= 60 * 6;
			else
				this.timer1 -= 200;

			var x = 1000 - Math.random() * 2000;
			var z = 1000 - Math.random() * 2000;
			if (this.player)
			{
				if (this.phase == 0)
					SpawnAsteroid(x, -8000, z, (90 + difficulty * 15) + Math.random() * 140);
				else
				{	
					var size = 600;

					var x = -(this.player.moveBorder + size / 2) * (Math.random() * 2 - 1);
					var y = -(this.player.moveBorder + size / 2) * (Math.random() * 2 - 1);
					while (this.testCollisionY(x - size / 2, y - size / 2, x + size / 2, y + size / 2, this.player.team))
					{
						x += size;
						if (x > this.player.moveBorder + size / 2)
						{
							x = -this.player.moveBorder - size / 2;
							y += size;
						}
					}
					if (y < this.player.moveBorder + size)
						SpawnShooter(x, -8000, y, (90 + difficulty * 15) + Math.random() * 140);
				}
			}
		}
	}

	return lvl;
}