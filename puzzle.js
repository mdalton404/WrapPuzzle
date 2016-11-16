(function(window, document, undefined){
	var 	image = new Image(),
			div = document.getElementById("puzzle"),
			container = document.getElementById("container"),
			statusP,
			scale = 80,
			border = 30,
			invScale = 1.0 / scale,
			ROWS = 3,
			COLS = 3,
			tiles = [],
			SPRITE_SHEET = "url('puzzle.png')",
			mouseX,
			mouseY,
			offsetX,
			offsetY,
			slideRow,
			slideCol,
			maskTile,
			slidingTile,
			interpolation = 0.5,
			maskRect;
	
	/* Sprite
	 *
	 * A css Sprite:
	 * sheet is the sprite-sheet which this object will be using to render the
	 * sprite. So sheetX and sheetY is the top left hand corner of the area we're
	 * grabbing. dx and dy are used optionally to place the sprite off-center
	 */
	function Sprite(x, y, sheet, sheetX, sheetY, width, height, dx, dy, maskRect){
		this.x = x;
		this.y = y;
		this.sheetX = sheetX;
		this.sheetY = sheetY;
		this.width = width;
		this.height = height;
		this.dx = dx || 0;
		this.dy = dy || 0;
		this.div = document.createElement("div");
		this.div.style.backgroundImage = sheet;
		this.div.style.backgroundPosition = (-sheetX) + "px " + (-sheetY) + "px";
		this.div.style.position = "absolute";
		this.div.style.width = width;
		this.div.style.height = height;
		this.maskRect = maskRect;
	}
	Sprite.prototype = {
		// updates the sprite position
		update: function(x, y){
			x = x ? parseInt(x) : this.x;
			y = y ? parseInt(y) : this.y;
			var posX = this.dx + x;
			var posY = this.dy + y;
			if(maskRect){
				
				// if inside the masking area - business as usual
				if(posX >= maskRect.x && posY >= maskRect.y && posX + this.width < maskRect.x + maskRect.width && posY + this.height < maskRect.x + maskRect.height){
					this.div.style.backgroundPosition = (-this.sheetX) + "px " + (-this.sheetY) + "px";
					this.div.style.width = this.width;
					this.div.style.height = this.height;
				
				// else clip the width and move the sheet reference to mask the
				// sprite with in the rectangle maskRect
				} else {
					this.div.style.width = Math.abs(Math.max(maskRect.x, posX) - Math.min(maskRect.x + maskRect.width, posX + this.width));
					this.div.style.height = Math.abs(Math.max(maskRect.y, posY) - Math.min(maskRect.y + maskRect.height, posY + this.height));
					var sheetPosX = -this.sheetX + (posX < 0 ? posX : 0);
					var sheetPosY = -this.sheetY + (posY < 0 ? posY : 0);
					this.div.style.backgroundPosition = sheetPosX + "px " + sheetPosY + "px";
					if(posX < 0) posX = 0;
					if(posY < 0) posY = 0;
				}
			}
			this.div.style.left = offsetX + posX;
			this.div.style.top = offsetY + posY;
		}
	}
	// calculates offset (needed to render relative to an element)
	function getOffset(element){
		offsetX = offsetY = 0;
		if(element.offsetParent){
			do{
				offsetX += element.offsetLeft;
				offsetY += element.offsetTop;
			} while ((element = element.offsetParent));
		}
	}
	/* Tile
	 *
	 * A tile in a sliding tile puzzle
	 */
	Tile.prototype = new Sprite();
	Tile.prototype.constructor = Tile;
	Tile.prototype.parent = Sprite.prototype;
	function Tile(r, c, sheet, maskRect){
		Sprite.call(this, c * scale, r * scale, sheet, c * scale, r * scale, scale, scale, 0, 0, maskRect);
		this.slideX = this.x;
		this.slideY = this.y;
		this.r = r;
		this.c = c;
	}
	Tile.prototype.copy = function(){
		var tile = new Tile(this.r, this.c, this.div.style.backgroundImage, this.maskRect);
		tile.x = this.x;
		tile.y = this.y;
		tile.slideX = this.slideX;
		tile.slideY = this.slideY;
		return tile;
	}
	
	// mouse listeners
	function mouseDown(e){
		var n;
		if(!maskTile){
			if(mouseY - offsetY < 0 || mouseY - offsetY >= ROWS * scale){
				if(mouseX - offsetX >= 0 && mouseX - offsetX < COLS * scale){
					n = mouseCol();
					if(mouseY - offsetY < 0){
						slideCol(n, -1);
					} else {
						slideCol(n, 1);
					}
				}
			} else if(mouseX - offsetX < 0 || mouseX - offsetX >= ROWS * scale){
				if(mouseY - offsetY >= 0 && mouseY - offsetY < ROWS * scale){
					n = mouseRow();
					if(mouseX - offsetX < 0){
							slideRow(n, -1);
					} else {
						slideRow(n, 1);
					}
				}
			}
			if(slidingCol != undefined || slidingRow != undefined){
				setTimeout(slide, 50);
			}
		}
		var c = complete();
		if(c == ROWS * COLS){
			statusP.innerHTML = "Great Success!";
		} else {
			var p = ((100 / (ROWS * COLS)) * c) >> 0;
			statusP.innerHTML = p + "% Complete";
		}
	}
	function mouseMove(e){
		mouseX = 0;
		mouseY = 0;
		e = e || window.event;
		if(e.pageX || e.pageY){
			mouseX = e.pageX;
			mouseY = e.pageY;
		} else if (e.clientX || e.clientY){
			mouseX = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			mouseY = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
	}
	
	// Called to prep the tiles
	function initTiles(){
		maskRect = {x:0, y:0, width:COLS * scale, height:ROWS * scale};
		getOffset(div);
		var r, c;
		for(r = 0; r < ROWS; r++){
			tiles[r] = [];
			for(c = 0; c < COLS; c++){
				tiles[r][c] = new Tile(r, c, SPRITE_SHEET, maskRect);
				tiles[r][c].update();
				div.appendChild(tiles[r][c].div);
			}
		}
		randomiseTiles();
	}
	
	function mouseCol(){
		return ((mouseX - offsetX) * invScale) >> 0;
	}
	
	function mouseRow(){
		return ((mouseY - offsetY) * invScale) >> 0;
	}
	
	function slideRow(n, dir, init){
		var newRow = [];
		var target;
		if(!init){
			if(dir > 0){
				maskTile = tiles[n][COLS - 1].copy();
			} else {
				maskTile = tiles[n][0].copy();
			}
			maskTile.update();
			div.appendChild(maskTile.div);
		}
		for(var i = 0; i < COLS; i++){
			target = i - dir;
			if(target >= COLS) target = 0;
			if(target < 0) target = COLS - 1;
			newRow[i] = tiles[n][target];
			newRow[i].x = i * scale;
			newRow[i].slideX = newRow[i].x - scale * dir;
		}
		tiles[n] = newRow;
		slidingRow = n;
	}
	
	function slideCol(n, dir, init){
		var newCol = [];
		var target, i;
		if(!init){
			if(dir > 0){
				maskTile = tiles[ROWS - 1][n].copy();
			} else {
				maskTile = tiles[0][n].copy();
			}
			maskTile.update();
			div.appendChild(maskTile.div);
		}
		for(i = 0; i < ROWS; i++){
			target = i - dir;
			if(target >= ROWS) target = 0;
			if(target < 0) target = ROWS - 1;
			newCol[i] = tiles[target][n];
			newCol[i].y = i * scale;
			newCol[i].slideY = newCol[i].y - scale * dir;
		}
		for(i = 0; i < ROWS; i++){
			tiles[i][n] = newCol[i];
		}
		slidingCol = n;
	}
	
	function slide(){
		var slidingTile, i;
		var update = true;
		if(slidingRow != undefined && slidingRow >= 0){
			slidingTile = tiles[slidingRow][0];
			var vx = (slidingTile.x - slidingTile.slideX) * interpolation;
			for(i = 0; i < COLS; i++){
				tiles[slidingRow][i].slideX += vx;
			}
			maskTile.slideX += vx;
			if(Math.abs(vx) < interpolation){
				for(i = 0; i < COLS; i++){
					tiles[slidingRow][i].slideX = tiles[slidingRow][i].x;
				}
				update = false;
			}
			for(i = 0; i < COLS; i++){
				tiles[slidingRow][i].update(tiles[slidingRow][i].slideX, tiles[slidingRow][i].y);
			}
			maskTile.update(maskTile.slideX, maskTile.y);
		}
		if(slidingCol != undefined && slidingCol >= 0){
			slidingTile = tiles[0][slidingCol];
			var vy = (slidingTile.y - slidingTile.slideY) * interpolation;
			for(i = 0; i < COLS; i++){
				tiles[i][slidingCol].slideY += vy;
			}
			maskTile.slideY += vy;
			if(Math.abs(vy) < interpolation){
				for(i = 0; i < ROWS; i++){
					tiles[i][slidingCol].slideY = tiles[i][slidingCol].y;
				}
				update = false;
			}
			for(i = 0; i < ROWS; i++){
				tiles[i][slidingCol].update(tiles[i][slidingCol].x, tiles[i][slidingCol].slideY);
			}
			maskTile.update(maskTile.x, maskTile.slideY);
		}
		if(update) setTimeout(slide, 50);
		else{
			div.removeChild(maskTile.div);
			maskTile = slidingCol = slidingRow = undefined;
		}
	}
	
	// Returns the number of tiles that are in their home position
	function complete(){
		var r, c;
		var total = 0;
		for(r = 0; r < ROWS; r++){
			for(c = 0; c < COLS; c++){
				if(tiles[r][c].r == r && tiles[r][c].c == c) total++;
			}
		}
		return total
	}
	
	// Randomises the tile positions
	//
	// IMPORTANT: Before you optimise this, know that there are starting positions in a
	// 8 Puzzle that are impossible to solve. You must randomise within possible user
	// interactions only to be safe or write a solver for it
	function randomiseTiles(){
		var n = 20;
		while(complete() > 1 || n-- > 0){
			if(Math.random() < 0.5){
				slideRow((Math.random() * ROWS) >> 0, Math.random() < 0.5 ? 1 : -1, true);
			} else {
				slideCol((Math.random() * COLS) >> 0, Math.random() < 0.5 ? 1 : -1, true);
			}
		}
		slidingRow = slidingCol = maskTile = undefined;
		for(r = 0; r < ROWS; r++){
			for(c = 0; c < COLS; c++){
				if(tiles[r][c]){
					tiles[r][c].slideX = c * scale;
					tiles[r][c].slideY = r * scale;
					tiles[r][c].update();
				}
			}
		}
	}
	
	// Initialisation from this point in
	function init(){
		div.innerHTML = "";
		div.style.width = COLS * scale;
		div.style.height = ROWS * scale;
		container.style.paddingLeft = border;
		container.style.paddingTop = border;
		container.style.width = border + COLS * scale;
		container.style.height = border + ROWS * scale;
		initTiles();
		container.addEventListener("mousedown", mouseDown, false);
		container.addEventListener("mousemove", mouseMove, false);
		statusP = document.createElement("p");
		container.parentNode.appendChild(statusP);
		var p = ((100 / (ROWS * COLS)) * c) >> 0;
		statusP.innerHTML = p + "% Complete";
	}
	image.onload = init;
	image.src = "puzzle.png";
	
}(this, this.document))