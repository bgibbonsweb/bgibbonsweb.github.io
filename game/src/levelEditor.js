isEditorMode = false;

loader = new THREE.TextureLoader();
outlineTex2 = loader.load( "tex/outline2.png" );

function LevelEditor()
{
	this.editFields = { };

	var select = document.getElementById("selectObj"); 

	for (var key in blockTypes)
	{
	    var el = document.createElement("option");
	    el.textContent = key;
	    el.value = key;
	    select.appendChild(el);
	}

	this.x = 0;
	this.y = 0;
	this.z = 750;

	this.zLayerPrev = 0;

	this.lastSelected = null;
	this.lastSelectedLeft = null;
	this.lastSelectedFields = null;

	this.moveSpeed = 0.001;
	this.zoomSpeed = 1;

	this.up = 87;
	this.down = 83;
	this.left = 65;
	this.right = 68;

	this.in = 38;
	this.out = 40;

	this.left2 = 37;
	this.right2 = 39;

	this.escKey = 27;
	this.del = 8;

	this.active = true;
	this.myPlayer = null;

	this.zKey = 90;
	this.saveKey = 70; // f
	this.loadKey = 76; // l

	this.blockMoving = null;
	this.xMovingPoint = 0;
	this.yMovingPoint = 0;

	var bodyMaterial = new THREE.MeshBasicMaterial( {
		color: 0xffffff,
		wireframe: false,
	} );


	var selMat = new THREE.MeshBasicMaterial( {
		map: outlineTex2,
		color: 0xffffff,
		opacity: 1.0,
		wireframe: false,
		transparent: true,
		depthWrite: false,
		depthRead: false,
	} );
	selMat.blending = THREE.AdditiveBlending;

	this.undoQueue = [];
	this.editorGameObjects = null;

	var geom = new THREE.PlaneGeometry(1, 1, 1, 1);

	this.block = new THREE.Mesh( geom, bodyMaterial );
	this.sel = new THREE.Mesh( geom, selMat );
	scene.add( this.block );
	scene.add( this.sel );

	this.prevShowEditorObjects = false;

	if (isEditorMode)
	{
		var top = document.getElementById("Top"); 
		var left = document.getElementById("Left"); 
		var right = document.getElementById("Right"); 
	    top.style.display = "block";
	    right.style.display = "block";
	    left.style.display = "block";
	}
}

LevelEditor.prototype.buildLeftField = function()
{
	var left = document.getElementById("Left");
	while (left.firstChild) {
	    left.removeChild(left.firstChild);
	}

	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));

	for (var i = 0; i < gameObjects.length; i++)
	{
		let obj = gameObjects[i];

		var div = document.createElement('div');
		var text = document.createTextNode(gameObjects[i].type);
		if (obj == this.lastSelected)
			div.style.color = "white";
		let parent = this;

		div.onclick = function() {
			parent.lastSelected = obj;
			var zItem = document.getElementById("z");
			zItem.value = obj.z;
			parent.buildEditFields();
		}

		div.appendChild(text);
		left.appendChild(div);
	}

	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));
	left.appendChild(document.createElement("br"));

}

LevelEditor.prototype.buildEditFields = function()
{
	editFields = { };

	var right = document.getElementById("Right");
	while (right.firstChild) {
	    right.removeChild(right.firstChild);
	}

	if (!this.lastSelected)
		return;


	right.appendChild(document.createElement("br"));
	right.appendChild(document.createElement("br"));
	right.appendChild(document.createElement("br"));
	right.appendChild(document.createElement("br"));

	var obj = this.lastSelected;
	for (let key in obj)
	{
		var isObject = typeof obj[key] == "object";
		let isColor = false;

		if (key.includes("color"))
		{
			isObject = false;
			isColor = true;
		}

		if (key != "mesh" && key != "system" && typeof obj[key] != "function" && !isObject && key != "type")
		{
			right.appendChild(document.createTextNode(key));

			// Create an <input> element, set its type and name attributes
			var input = document.createElement("input");
			input.type = typeof obj[key] == "boolean" ? "checkbox" : "text";

			input.value = obj[key];

			if (typeof obj[key] == "number")
				input.type = "number";
			else if (isColor)
			{
				input.type = "color";
				input.value = "#" + obj[key].getHexString();
				console.log(obj[key], obj[key].getHexString());
			}

			input.name = key;
			input.id = key;



			if (obj[key])
				input.checked = true;

			right.appendChild(input);
			this.editFields[key] = document.getElementById(key);

			input.onchange = function() {

				if (typeof obj[key] == "number" )
					obj[key] = parseInt(this.value);
				else if(typeof obj[key] == "boolean" )
					obj[key] = this.checked;
				else if (isColor)
					obj[key] = new THREE.Color(this.value);
				else
					obj[key] = this.value;
				
				obj.hide();
				obj.show();
				// obj[key] = this.value;
			};

			// Append a line break 
			right.appendChild(document.createElement("br"));
			right.appendChild(document.createElement("br"));
		}
	}
}

LevelEditor.prototype.getMoveMode = function()
{
	var a = document.getElementById("mode");
	var key = a.options[a.selectedIndex].value;
	return key;
}

LevelEditor.prototype.snapX = function(x, y1, y2, buffer, origBlock)
{
	var key = this.getMoveMode();
	if (key == "free")
		return x;
	else if (key == "grid")
	{
		var grid = document.getElementById("x");
		var size = parseInt(grid.value);
		return Math.round(x / size) * size;
	}

	var smallY = Math.min(y1, y2);
	var bigY = Math.max(y1, y2);

	var hasBestX = false;
	var bestX = 0;
	var bestDist = buffer;

	for (var i = 0; i < gameObjects.length; i++) 
	{
		var obj = gameObjects[i];
		if (origBlock !== obj && obj.y - obj.sizeY / 2 <= bigY && obj.y + obj.sizeY / 2 >= smallY)
		{
			{
				var newX = obj.x - obj.sizeX / 2;
				var dx = Math.abs(x - newX);
				if (dx < bestDist)
				{
					hasBestX = true;
					bestX = newX;
					bestDist = dx;
				}
			}

			{
				var newX = obj.x + obj.sizeX / 2;
				var dx = Math.abs(x - newX);
				if (dx < bestDist)
				{
					hasBestX = true;
					bestX = newX;
					bestDist = dx;
				}
			}
		}
	}

	if (hasBestX)
		return bestX;
	else
		return x;
}


LevelEditor.prototype.doUndo = function()
{
	var undo = this.undoQueue.pop();
	if (undo)
	{
		for (var i = 0; i < gameObjects.length; i++)
			gameObjects[i].hide();
		gameObjects = undo.gameObjects;

		for (var i = 0; i < gameObjects.length; i++)
			gameObjects[i].show();
	}
}

LevelEditor.prototype.addToUndoQueue = function()
{	
	var undo = { };
	undo.gameObjects = [];

	for (var i = 0; i < gameObjects.length; i++) 
	{	
		var obj = gameObjects[i];
		var newObj = Object.create(obj);

		for (var key in obj)
			newObj[key] = obj[key];

		undo.gameObjects.push(newObj);
	}

	this.undoQueue.push(undo);
}


LevelEditor.prototype.snapY = function(y, x1, x2, buffer, origBlock)
{
	var key = this.getMoveMode();
	if (key == "free")
		return y;
	else if (key == "grid")
	{
		var grid = document.getElementById("x");
		var size = parseInt(grid.value);
		return Math.round(y / size) * size;
	}

	var smallX = Math.min(x1, x2);
	var bigX = Math.max(x1, x2);

	var hasBestY = false;
	var bestY = 0;
	var bestDist = buffer;

	for (var i = 0; i < gameObjects.length; i++) 
	{
		var obj = gameObjects[i];
		if (origBlock !== obj && obj.x - obj.sizeX / 2 <= bigX && obj.x + obj.sizeX / 2 >= smallX)
		{
			{
				var newY = obj.y - obj.sizeY / 2;
				var dy = Math.abs(y - newY);
				if (dy < bestDist)
				{
					hasBestY = true;
					bestY = newY;
					bestDist = dy;
				}
			}

			{
				var newY = obj.y + obj.sizeY / 2;
				var dy = Math.abs(y - newY);
				if (dy < bestDist)
				{
					hasBestY = true;
					bestY = newY;
					bestDist = dy;
				}
			}
		}
	}

	if (hasBestY)
		return bestY;
	else
		return y;
}


LevelEditor.prototype.save = function() {

	var saveObjs = [];
	for (var i = 0; i < gameObjects.length; i++) 
	{	
		var obj = gameObjects[i];
		var newObj = Object.create(obj);

		for (var key in obj)
		{
			if (key != "mesh" && key != "system" && key != "uniforms")
				newObj[key] = obj[key];
		}

		saveObjs.push(newObj);
	}

	var masterObj = {};
	masterObj.gameObjects = saveObjs;
    var jsonString= JSON.stringify(masterObj);

    var myWindow = window.open("", "", "");
    myWindow.document.write(jsonString);
}

beginLevel = function() {
;
	showEditorObjects = false;
	resetObjectLists();
	for (var i = 0; i < gameObjects.length; i++)
	{
		var obj = gameObjects[i];
		try {
			obj.begin();
		}
		catch(e) {
			console.log(e);
		}
	}	
}

load = function(forEditor, levelName, levelText) {

	var text;
	if (forEditor)
		var text = window.prompt("", "");
	else if (levelText)
		text = levelText;
	else 
	{	
		var top = document.getElementById("Top"); 
		var left = document.getElementById("Left"); 
		var right = document.getElementById("Right"); 
	    top.style.display = "none";
	    right.style.display = "none";
	    left.style.display = "none";	

		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4 && xhttp.status == 200) {

				showEditorObjects = false;

				load(forEditor, levelName, xhttp.responseText);
				beginLevel();
			}
		};
		xhttp.open("GET", levelName, true);
		xhttp.send();
		return;
	}

	if (text && text.length > 0) {

		var masterLoadObj = JSON.parse(text);
		var ary = masterLoadObj.gameObjects;

		if (ary && ary.length > 0)
		{
			for (var i = 0; i < gameObjects.length; i++)
			{
				var obj = gameObjects[i];
				obj.hide();
			}

			gameObjects.length = 0;

			for (var i = 0; i < ary.length; i++)
			{
				var obj = ary[i];
				var newObj = new window[obj.type](obj.x, obj.y, obj.z, obj.sizeX, obj.sizeY);

				for (var key in obj)
				{
					if (key.includes("color"))
						newObj[key] = new THREE.Color(obj[key]);	
					else
						newObj[key] = obj[key];
				}

				addGameObject(newObj);
				newObj.hide();
				newObj.show();
			}
		}
	}
}

if (!isEditorMode)
	load(false, "lvl/basic.txt");


LevelEditor.prototype.update = function(dTime)
{
	if (!isEditorMode)
		return;

	if (this.lastSelectedLeft != this.lastSelected)
		this.buildLeftField();

	this.lastSelectedLeft = this.lastSelected;

	if (currentlyPressedKeys[this.escKey] && !previouslyPressedKeys[this.escKey])
	{
		if (!this.active)
		{
			this.active = true;

			for (var i = 0; i < gameObjects.length; i++)
				gameObjects[i].hide();
			gameObjects = this.editorGameObjects;

			for (var i = 0; i < gameObjects.length; i++)
				gameObjects[i].show();

			var top = document.getElementById("Top"); 
			var left = document.getElementById("Left"); 
			var right = document.getElementById("Right"); 
		    top.style.display = "block";
		    right.style.display = "block";
		    left.style.display = "block";
		}
		else
		{
			showEditorObjects = false;
			this.editorGameObjects = [];
			
			for (var i = 0; i < gameObjects.length; i++) 
			{	
				var obj = gameObjects[i];
				obj.show();
				var newObj = Object.create(obj);

				for (var key in obj)
					newObj[key] = obj[key];

				this.editorGameObjects.push(newObj);
			}

			//addPlayerObject(this.myPlayer);
			this.active = false;
		
			beginLevel();
				
			var top = document.getElementById("Top"); 
			var left = document.getElementById("Left"); 
			var right = document.getElementById("Right"); 
		    top.style.display = "none";
		    right.style.display = "none";
		    left.style.display = "none";	
		}
		return;
	}

	if (!this.active)
		return;
	
	if (this.lastSelected)
	{
		this.sel.scale.x = this.lastSelected.sizeX;
		this.sel.scale.y = this.lastSelected.sizeY;
		this.sel.position.x = this.lastSelected.x;
		this.sel.position.y = this.lastSelected.y;
		this.sel.position.z = this.lastSelected.z + 1;
	}
	else
		this.sel.scale.x = 0;

	var scrollMult = 2;
	this.x += wheelX * this.moveSpeed * this.z * scrollMult;
	this.y -= wheelY * this.moveSpeed * this.z * scrollMult;

	var zLayer = document.getElementById("z");
	var z = parseInt(zLayer.value);

	var moveExistingBox = document.getElementById("move");
	var moveExisting = moveExistingBox.checked;

	if (this.prevShowEditorObjects != showEditorObjects)
	{
		this.prevShowEditorObjects = showEditorObjects;

		for (var i = 0; i < gameObjects.length; i++)
		{
			var obj = gameObjects[i];
			obj.show();
		}	
	}

	this.zLayerPrev = z;

	if (currentlyPressedKeys[this.saveKey])
	{
		this.save();
		currentlyPressedKeys[this.saveKey] = false;
	}

	if (currentlyPressedKeys[this.loadKey])
	{
		currentlyPressedKeys[this.loadKey] = false;
		load(true);
		this.buildLeftField();
	}

	var showEditorObjectsBox = document.getElementById("editorObjs");
	showEditorObjects = showEditorObjectsBox.checked;

	if (currentlyPressedKeys[this.zKey] && !previouslyPressedKeys[this.zKey])
	{
		this.doUndo();
	}

	if (currentlyPressedKeys[this.left] || currentlyPressedKeys[this.left2])
		this.x -= dTime * this.moveSpeed * this.z;
	if (currentlyPressedKeys[this.right] || currentlyPressedKeys[this.right2])
		this.x += dTime * this.moveSpeed * this.z;

	if (currentlyPressedKeys[this.down])
		this.y -= dTime * this.moveSpeed * this.z;
	if (currentlyPressedKeys[this.up])
		this.y += dTime * this.moveSpeed * this.z;

	if (this.lastSelected && currentlyPressedKeys[this.del])
	{
		this.addToUndoQueue();
		killObject(this.lastSelected);
		this.lastSelected = null;
		this.buildEditFields();
	}

	if (currentlyPressedKeys[this.in])
	{
		this.z -= dTime * this.zoomSpeed;
	}
	if (currentlyPressedKeys[this.out])
	{
		this.z += dTime * this.zoomSpeed;
	}

	if (this.z < 25)
		this.z = 25;

	var mult = this.z / 700;
	var xBuffer = this.z * 10 / 700;
	var yBuffer = this.z * 10 / 700;

	if (mouseDown > 0 || previousMouseDown > mouseDown && !this.blockMoving)
	{
		if (previousMouseDown == 0)
			this.addToUndoQueue();

		var mouseCounter = 0;
		var x1 = this.x + (mouseX[mouseCounter] - window.innerWidth / 2) * mult;
		var y1 = this.y - (mouseY[mouseCounter] - window.innerHeight / 2) * mult;

		var x2 = this.x + (mouseXDown[mouseCounter] - window.innerWidth / 2) * mult;
		var y2 = this.y - (mouseYDown[mouseCounter] - window.innerHeight / 2) * mult;
		
		var minX = 4;
		var minY = 4;

		var moveMode = this.getMoveMode();
		if (moveMode == "grid")
		{
			var grid = document.getElementById("x");
			minX = parseInt(grid.value);
			grid = document.getElementById("y");
			minY = parseInt(grid.value);
		}

		var previousMoving = this.blockMoving;
		
		if (moveExisting)
		{
			if (this.lastSelected && !this.blockMoving)
			{
				var temp = [this.lastSelected];
				this.blockMoving = isObject(x2, x2, y2, y2, temp, z);
			}
			if (!this.blockMoving)
				this.blockMoving = isObject(x2, x2, y2, y2, gameObjects, z, !showEditorObjects);
			if (!this.blockMoving)
				this.blockMoving = isObject(x2 - xBuffer, x2 + xBuffer, y2 - yBuffer, y2 + yBuffer, gameObjects, z, !showEditorObjects);
		}
		
		if (this.blockMoving)
		{
			x1 = this.snapX(x1, this.blockMoving.y - this.blockMoving.sizeY / 2, this.blockMoving.y + this.blockMoving.sizeY / 2, xBuffer, this.blockMoving);
			y1 = this.snapY(y1, this.blockMoving.x - this.blockMoving.sizeX / 2, this.blockMoving.x + this.blockMoving.sizeX / 2, yBuffer, this.blockMoving);
		}
		else
		{
			x1 = this.snapX(x1, y1, y2, xBuffer, this.blockMoving);
			y1 = this.snapY(y1, x1, x2, yBuffer, this.blockMoving);
		}

		if (this.blockMoving)
		{
			this.lastSelected = this.blockMoving;
			this.lastSelectedFields = this.blockMoving;
			this.buildEditFields();

			this.block.scale.set(0, 0, 1);
			if (!previousMoving)
			{
				this.oldBlockX = this.blockMoving.x;
				this.oldBlockY = this.blockMoving.y;
				this.oldBlockSizeX = this.blockMoving.sizeX;
				this.oldBlockSizeY = this.blockMoving.sizeY;

				var xBuffer = this.z * 10 / 700;
				var yBuffer = this.z * 10 / 700;

				if (x2 < this.blockMoving.x - this.blockMoving.sizeX / 2 + xBuffer)
				{
					this.xMovingPoint = 1;
				}
				else if (x2 > this.blockMoving.x + this.blockMoving.sizeX / 2 - xBuffer)
				{
					this.xMovingPoint = -1;	
				}
				else
					this.xMovingPoint = 0;


				if (y2 < this.blockMoving.y - this.blockMoving.sizeY / 2 + yBuffer)
				{
					this.yMovingPoint = 1;
				}
				else if (y2 > this.blockMoving.y + this.blockMoving.sizeY / 2 - yBuffer)
				{
					this.yMovingPoint = -1;	
				}
				else
					this.yMovingPoint = 0;
			}

			if (moveMode == "grid")
			{
				x2 = this.snapX(x2, y1, y2, xBuffer, this.blockMoving);
				y2 = this.snapY(y2, x1, x2, yBuffer, this.blockMoving);
			}

			if (this.xMovingPoint != 0 || this.yMovingPoint != 0)
			{
				var newX = this.oldBlockX;
				var newY = this.oldBlockY;

				var newSizeX = Math.max(minX, this.oldBlockSizeX);
				var newSizeY = Math.max(minY, this.oldBlockSizeY);

				if (this.xMovingPoint != 0)
				{
					x2 = this.oldBlockX - this.oldBlockSizeX / 2 * this.xMovingPoint;
					newSizeX = Math.max(minX, this.oldBlockSizeX - (x1 - x2) * this.xMovingPoint);
					newX = this.oldBlockX - (x2 - x1) / 2;
				}
				if (this.yMovingPoint != 0)
				{
					y2 = this.oldBlockY - this.oldBlockSizeY / 2 * this.yMovingPoint;
					newSizeY = Math.max(minY, this.oldBlockSizeY - (y1 - y2) * this.yMovingPoint);
					newY = this.oldBlockY - (y2 - y1) / 2;
				}

				if (moveMode == "grid")
				{
					newX = (this.snapX(newX - newSizeX / 2) + this.snapX(newX + newSizeX / 2)) / 2;
					newY = (this.snapY(newY - newSizeY / 2) + this.snapY(newY + newSizeY / 2)) / 2;
				}


				this.blockMoving.setPosition(newX, newY);
				this.blockMoving.setSize(newSizeX, newSizeY)
			}
			else
			{
				var newX = this.oldBlockX + (x1 - x2);
				var newY = this.oldBlockY + (y1 - y2);

				if (moveMode == "grid")
				{
					newX = (this.snapX(newX - this.blockMoving.sizeX / 2) + this.snapX(newX + this.blockMoving.sizeX / 2)) / 2;
					newY = (this.snapY(newY - this.blockMoving.sizeY / 2) + this.snapY(newY + this.blockMoving.sizeY / 2)) / 2;
				}
				else
				{
					newX = this.snapX(newX - this.blockMoving.sizeX / 2, this.blockMoving.y - this.blockMoving.sizeY / 2, this.blockMoving.y + this.blockMoving.sizeY / 2, xBuffer, this.blockMoving)
					 + this.blockMoving.sizeX / 2;
					newX = this.snapX(newX + this.blockMoving.sizeX / 2, this.blockMoving.y - this.blockMoving.sizeY / 2, this.blockMoving.y + this.blockMoving.sizeY / 2, xBuffer, this.blockMoving)
					 - this.blockMoving.sizeX / 2;

					newY = this.snapY(newY - this.blockMoving.sizeY / 2, this.blockMoving.x - this.blockMoving.sizeX / 2, this.blockMoving.x + this.blockMoving.sizeX / 2, yBuffer, this.blockMoving)
					 + this.blockMoving.sizeY / 2;
					newY = this.snapY(newY + this.blockMoving.sizeY / 2, this.blockMoving.x - this.blockMoving.sizeX / 2, this.blockMoving.x + this.blockMoving.sizeX / 2, yBuffer, this.blockMoving)
					 - this.blockMoving.sizeY / 2;
				}


				this.blockMoving.setPosition(newX, newY);
			}
		}	
		else
		{
			var x1 = this.x + (mouseX[mouseCounter] - window.innerWidth / 2) * mult;
			var y1 = this.y - (mouseY[mouseCounter] - window.innerHeight / 2) * mult;

			var x2 = this.x + (mouseXDown[mouseCounter] - window.innerWidth / 2) * mult;
			var y2 = this.y - (mouseYDown[mouseCounter] - window.innerHeight / 2) * mult;

			var smallX = Math.min(x1, x2);
			var smallY = Math.min(y1, y2);
			var bigX = Math.max(x1, x2);
			var bigY = Math.max(y1, y2);

			if (moveMode == "grid")
			{
				smallX = Math.floor(smallX / minX) * minX;
				bigX = Math.ceil(bigX / minX) * minX;

				smallY = Math.floor(smallY / minY) * minX;
				bigY = Math.ceil(bigY / minY) * minX;
			}
			else
			{
				smallX = this.snapX(smallX, smallY, bigY, xBuffer, null);
				bigX = this.snapX(bigX, smallY, bigY, xBuffer, null);

				smallY = this.snapY(smallY, smallX, bigX, yBuffer, null);
				bigY = this.snapY(bigY, smallX, bigX, yBuffer, null);
			}

			var sizeX = bigX - smallX;
			var sizeY = bigY - smallY;

			sizeX = Math.max(sizeX, minX);
			sizeY = Math.max(sizeY, minY);

			var newX = (bigX + smallX) / 2;
			var newY = (bigY + smallY) / 2;

			newX = (this.snapX(newX - sizeX / 2) + this.snapX(newX + sizeX / 2)) / 2;
			newY = (this.snapY(newY - sizeY / 2) + this.snapY(newY + sizeY / 2)) / 2;

			this.block.scale.x = sizeX;
			this.block.scale.y = sizeY;

			this.block.position.x = newX;
			this.block.position.y = newY;
			this.block.position.z = z;

			this.sel.scale.x = 0;
			
			if (previousMouseDown > mouseDown)
			{
				var a = document.getElementById("selectObj");
				var key = a.options[a.selectedIndex].value;

				var newObj = new window[key](newX, newY, z, sizeX, sizeY);
				newObj.type = key;

				addGameObject(newObj);

				if (this.lastSelectedFields && this.lastSelectedFields.type == key)
				{
					for (var key in this.lastSelectedFields)
						if (key != "x" && key != "y" && key != "z" && key != "sizeX" && key != "sizeY" && key != "sizeZ" && key != "mesh" && key != "system")
						{
							newObj[key] = this.lastSelectedFields[key]
						}
				}

				newObj.hide();
				newObj.show();

				this.lastSelected = newObj;
				this.lastSelectedFields = newObj;
				this.buildEditFields();
				this.block.scale.set(0, 0, 1);
			}
		}
	}	
	if (mouseDown == 0)
		this.blockMoving = null;

	if (!this.myPlayer)
	{
		camera.position.x = this.x;
		camera.position.y = this.y;
		camera.position.z = this.z + z;
	}
}

LevelEditor.prototype.hide = function()
{	
}

LevelEditor.prototype.show = function()
{	

}

LevelEditor.prototype.die = function()
{	

}