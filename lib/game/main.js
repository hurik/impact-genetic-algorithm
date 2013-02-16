ig.module( 
	'game.main' 
)
.requires(
	'impact.game',

	'plugins.empika.game_utilities',
	'plugins.empika.entity_utilities',
	'plugins.empika.debug_display',

	//'impact.debug.debug',

	'game.levels.map'
)
.defines(function(){

MyGame = ig.Game.extend({

	// Load a font
	font: new ig.Font('media/04b03.font.png'),
	fontRed: new ig.Font('media/04b03.font.red.png'),

	warehouse: null,
	shops: null,

	population: new Array(),
	populationSize: 2000,

	generation: 0,
	generationMax: 150,

	mutationProbability: 0.05,
	crossoverProbability: 0.1,

	mutationCounter: 0,
	crossoverCounter: 0,

	currentBestChromosome: null,
	currentBestChromosomeFitness: null,

	currentTotalFitness: 0,

	running: false,
	finished: false,

	init: function() {
		this.loadLevel(LevelMap);

		this.warehouse = ig.game.getEntitiesByType('EntityWarehouse')[0];
		this.shops = ig.game.getEntitiesByType('EntityShop');

		ig.input.bind(ig.KEY.SPACE, 'startStop');
		ig.input.bind(ig.KEY.R, 'keyR');
		ig.input.bind(ig.KEY.T, 'keyT');
		ig.input.bind(ig.KEY.F, 'keyF');
		ig.input.bind(ig.KEY.G, 'keyG');
		ig.input.bind(ig.KEY.V, 'keyV');
		ig.input.bind(ig.KEY.B, 'keyB');
		ig.input.bind(ig.KEY.Z, 'keyZ');
		ig.input.bind(ig.KEY.U, 'keyU');
		ig.input.bind(ig.KEY.H, 'keyH');
		ig.input.bind(ig.KEY.J, 'keyJ');

		ig.input.bind(ig.KEY.MOUSE1, 'lbtn');

		this.debugDisplay = new DebugDisplay(this.font);
	},

	update: function() {
		// Update all entities and backgroundMaps
		this.parent();

		if(ig.input.pressed('startStop')) {
			if(!this.running) {
				this.running = true;

				// Generate population
				for(var i = 0; i < this.populationSize; i++) {
					this.population.push(this.generateChromosome());
				}

				this.getBestChromosome();
			} else {
				this.running = false;
				this.finished = false;

				this.population = [];
				this.generation = 0;

				this.mutationCounter = 0;
				this.crossoverCounter = 0;

				this.currentBestChromosome = null;
				this.currentBestChromosomeFitness = 0;

				this.currentTotalFitness = 0;
			}
		}
		if(!this.running) {
			if(ig.input.state('keyR')) {
				if(this.generationMax > 1) {
					this.generationMax--;
				}
			}

			if(ig.input.state('keyT')) {
				this.generationMax++;
			}

			if(ig.input.state('keyF')) {
				if(this.populationSize > 10) {
					this.populationSize = this.populationSize - 10;
				}
			}

			if(ig.input.state('keyG')) {
				this.populationSize = this.populationSize + 10;
			}

			if(ig.input.pressed('keyV')) {
				if(this.shops.length > 3) {
					this.removeEntity(this.shops[this.shops.length - 1]);
					this.shops = ig.game.getEntitiesByType('EntityShop');
				}
			}

			if(ig.input.pressed('keyB')) {
				this.spawnEntity("EntityShop", this.random(8, 304), this.random(8, 192));
				this.shops = ig.game.getEntitiesByType('EntityShop');
			}

			if(ig.input.state('keyZ')) {
				if(this.mutationProbability > 0) {
					this.mutationProbability = this.mutationProbability - 0.001;
				}
			}

			if(ig.input.state('keyU')) {
				this.mutationProbability = this.mutationProbability + 0.001;
			}

			if(ig.input.state('keyH')) {
				if(this.crossoverProbability > 0) {
					this.crossoverProbability = this.crossoverProbability - 0.001;
				}
			}

			if(ig.input.state('keyJ')) {
				this.crossoverProbability = this.crossoverProbability + 0.001;
			}

		}

		// Add your own, additional update code here
		if(this.generation < this.generationMax && this.running) {
			this.selection();
			this.mutation();
			this.crossover();

			this.getBestChromosome();

			this.generation++;
		}

		if(this.generation == this.generationMax - 1) {
			this.finished = true;
		}
	},

	draw: function() {
		// Draw all entities and backgroundMaps
		this.parent();

		// Add your own drawing code here
		if(this.running) {
			var warehouseX = this.warehouse.pos.x + this.warehouse.size.x / 2;
			var warehouseY = this.warehouse.pos.y + this.warehouse.size.y / 2;

			var firstShopX = this.shops[this.currentBestChromosome[0]].pos.x + this.shops[this.currentBestChromosome[0]].size.x / 2;
			var firstShopY = this.shops[this.currentBestChromosome[0]].pos.y + this.shops[this.currentBestChromosome[0]].size.y / 2;

			var lastShopX = this.shops[this.currentBestChromosome[this.currentBestChromosome.length - 1]].pos.x + this.shops[this.currentBestChromosome[this.currentBestChromosome.length - 1]].size.x / 2;
			var lastShopY = this.shops[this.currentBestChromosome[this.currentBestChromosome.length - 1]].pos.y + this.shops[this.currentBestChromosome[this.currentBestChromosome.length - 1]].size.y / 2;

			this._drawLine(warehouseX, warehouseY, firstShopX, firstShopY, 1, 0, 255, 0, 0.5);
			this._drawLine(warehouseX, warehouseY, lastShopX, lastShopY, 1, 0, 255, 0, 0.5);

			for(var i = 0; i < this.currentBestChromosome.length - 1; i++) {
				var shopOneX = this.shops[this.currentBestChromosome[i]].pos.x + this.shops[this.currentBestChromosome[i]].size.x / 2;
				var shopOneY = this.shops[this.currentBestChromosome[i]].pos.y + this.shops[this.currentBestChromosome[i]].size.y / 2;

				var shopTwoX = this.shops[this.currentBestChromosome[i + 1]].pos.x + this.shops[this.currentBestChromosome[i + 1]].size.x / 2;
				var shopTwoY = this.shops[this.currentBestChromosome[i + 1]].pos.y + this.shops[this.currentBestChromosome[i + 1]].size.y / 2;

				this._drawLine(shopOneX, shopOneY, shopTwoX, shopTwoY, 1, 0, 255, 0, 0.5);
			}

			this.font.draw(this.generation, 320, 226, ig.Font.ALIGN.RIGHT);
			this.font.draw(this.currentTotalFitness.round(), 320, 234, ig.Font.ALIGN.RIGHT);
			this.font.draw(this.currentBestChromosomeFitness.round(), 320, 242, ig.Font.ALIGN.RIGHT);
			this.font.draw(this.mutationCounter, 320, 250, ig.Font.ALIGN.RIGHT);
			this.font.draw(this.crossoverCounter, 320, 258, ig.Font.ALIGN.RIGHT);

			if(this.font.widthForString(this.currentBestChromosome.toString()) <= 320) {
				this.font.draw(this.currentBestChromosome.toString(), 159, 274, ig.Font.ALIGN.CENTER);
			} else {
				this.font.draw("TOO LONG!", 159, 274, ig.Font.ALIGN.CENTER);
			}
		}

		if(this.finished) {
			this.fontRed.draw("FINISHED! - Reset (SPACE)", 160, 210, ig.Font.ALIGN.CENTER);
		} else if(this.running) {
			this.fontRed.draw("RUNNING! - Stop (SPACE)", 160, 210, ig.Font.ALIGN.CENTER);
		} else {
			this.fontRed.draw("You can change the options or move the points! - Start (Space)", 160, 210, ig.Font.ALIGN.CENTER);
		}


		this.font.draw("Options", 1, 218, ig.Font.ALIGN.LEFT);
		this.font.draw("Generations (r/t):", 1, 226, ig.Font.ALIGN.LEFT);
		this.font.draw(this.generationMax, 158, 226, ig.Font.ALIGN.RIGHT);
		this.font.draw("Population (f/g):", 1, 234, ig.Font.ALIGN.LEFT);
		this.font.draw(this.populationSize, 158, 234, ig.Font.ALIGN.RIGHT);
		this.font.draw("Erase/Add Shops (v/b):", 1, 242, ig.Font.ALIGN.LEFT);
		this.font.draw(this.shops.length, 158, 242, ig.Font.ALIGN.RIGHT);
		this.font.draw("Mutations Probability (z/u):", 1, 250, ig.Font.ALIGN.LEFT);
		this.font.draw(this.mutationProbability.toFixed(3), 158, 250, ig.Font.ALIGN.RIGHT);
		this.font.draw("Crossover Probability (h/j):", 1, 258, ig.Font.ALIGN.LEFT);
		this.font.draw(this.crossoverProbability.toFixed(3), 158, 258, ig.Font.ALIGN.RIGHT);

		this.font.draw("Statistic", 162, 218, ig.Font.ALIGN.LEFT);
		this.font.draw("Current Generation:", 162, 226, ig.Font.ALIGN.LEFT);
		this.font.draw("Population Fitness:", 162, 234, ig.Font.ALIGN.LEFT);
		this.font.draw("Best Chromosome Fitness:", 162, 242, ig.Font.ALIGN.LEFT);
		this.font.draw("Mutations:", 162, 250, ig.Font.ALIGN.LEFT);
		this.font.draw("Crossovers:", 162, 258, ig.Font.ALIGN.LEFT);
		this.font.draw("Best Chromosome:", 159, 266, ig.Font.ALIGN.CENTER);

		for(var i = 0; i < this.shops.length; i++) {
			this.font.draw(i, this.shops[i].pos.x - 4, this.shops[i].pos.y - 4, ig.Font.ALIGN.LEFT);
		}

		this.debugDisplay.draw();
	},

	getBestChromosome: function() {
		var bestFitness = 999999999,
			bestFitnessNumber = 0;

		this.currentTotalFitness = 0;

		for(var i = 0; i < this.populationSize; i++) {
			var fitness = this.calculateFitness(this.population[i]);

			this.currentTotalFitness += fitness;

			if(fitness < bestFitness) {
				bestFitness = fitness;
				this.currentBestChromosome = this.population[i];
				this.currentBestChromosomeFitness = fitness;
			}
		}
	},

	crossover: function() {
		var remaining = new Array();

		for(var i = 0; i < this.populationSize; i++) {
			remaining.push(i);
		}

		while(remaining.length >= 2) {
			var r1n = this.random(0, remaining.length - 1);
			var r1 = remaining[r1n];
			remaining.splice(r1n, 1);
			var r2n = this.random(0, remaining.length - 1);
			var r2 = remaining[r2n];
			remaining.splice(r2n, 1);

			if(Math.random() <= this.crossoverProbability) {
				this.crossoverCounter++;

				var crossoverPoint = this.random(0, this.population[r1].length - 2);

				var c1 = this.population[r1];
				var c1c = c1.slice(0);
				var c2 = this.population[r2];
				var c2c = c2.slice(0);

				for(var i = 0; i < crossoverPoint + 1; i++) {
					var temp1 = c1[i];
					c1[i] = c2c[i];

					for(var j = 0; j < c1.length; j++) {
						if(j != i && c1[j] == c1[i]) {
							c1[j] = temp1;
							break;
						}
					}

					var temp2 = c2[i];
					c2[i] = c1c[i];

					for(var j = 0; j < c1.length; j++) {
						if(j != i && c2[j] == c2[i]) {
							c2[j] = temp2;
							break;
						}
					}
				}
			}
		}
	},

	mutation: function() {
		for(var i = 0; i < this.populationSize; i++) {
			var chromosome = this.population[i];

			for(var j = 0; j < chromosome.length; j++) {
				if(Math.random() <= this.mutationProbability) {
					this.mutationCounter++;

					var temp = chromosome[j];
					chromosome[j] = this.random(0, this.shops.length - 1);

					if(temp == chromosome[j]) {
						if(chromosome[j] != 0) {
							chromosome[j]--;
						} else {
							chromosome[j]++;
						}
					}

					for(var k = 0; k < chromosome.length; k++) {
						if(k != j && chromosome[k] == chromosome[j]) {
							chromosome[k] = temp;
							break;
						}
					}
				}
			}
		}
	},

	selection: function() {
		var newPopulation = new Array();

		var maxFitness = 0,
			totalFitness = 0;

		var fitness = new Array(this.populationSize);

		for(var i = 0; i < this.populationSize; i++) {
			fitness[i] = this.calculateFitness(this.population[i]);
			maxFitness = Math.max(maxFitness, fitness[i]);
		}

		for(var i = 0; i < this.populationSize; i++) {
			fitness[i] = Math.pow(1.2, (maxFitness - fitness[i]) / 100.0);
			totalFitness += fitness[i];
		}

		for(var i = 0; i < this.populationSize; i++) {
			var z = Math.random() * totalFitness;
			var helper = 0;

			for(var j = 0; j < this.populationSize; j++) {
				if(z <= helper + fitness[j]) {
					newPopulation.push(this.population[j].slice(0));
					break;
				}

				helper += fitness[j];
			}
		}

		this.population = newPopulation;
	},

	calculateFitness: function(chromosome) {
		var pathLenght = 0;

		for(var i = 0; i < chromosome.length - 1; i++) {
			var s1 = this.shops[chromosome[i]].pos;
			var s2 = this.shops[chromosome[i + 1]].pos;

			pathLenght += Math.sqrt(Math.pow(s2.x - s1.x, 2) + Math.pow(s2.y - s1.y, 2));
		}

		var fs = this.shops[chromosome[0]].pos;
		var ls = this.shops[chromosome[chromosome.length - 1]].pos;
		var wh = this.warehouse.pos;

		pathLenght += Math.sqrt(Math.pow(fs.x - wh.x, 2) + Math.pow(fs.y - wh.y, 2));
		pathLenght += Math.sqrt(Math.pow(ls.x - wh.x, 2) + Math.pow(ls.y - wh.y, 2));

		return pathLenght;
	},

	generateChromosome: function() {
		var chromosome = new Array();

		var remainingStations = new Array();

		for(var i = 0; i < this.shops.length; i++) {
			remainingStations.push(i);
		}

		for(var i = 0; i < this.shops.length; i++) {
			var randomNumber = this.random(0, remainingStations.length - 1);

			chromosome.push(remainingStations[randomNumber]);

			remainingStations.splice(randomNumber, 1);
		}

		return chromosome;
	},

	_drawLine: function(x1, y1, x2, y2, width, r, g, b, a) {
		ig.system.context.strokeStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
		ig.system.context.lineWidth = width * ig.system.scale;

		ig.system.context.beginPath();
		ig.system.context.moveTo(
		ig.system.getDrawPos(x1 - ig.game.screen.x), ig.system.getDrawPos(y1 - ig.game.screen.y));
		ig.system.context.lineTo(
		ig.system.getDrawPos(x2 - ig.game.screen.x), ig.system.getDrawPos(y2 - ig.game.screen.y));
		ig.system.context.stroke();
		ig.system.context.closePath();
	},

	random: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	printPopulation: function() {
		var totalFitness = 0,
			fitness;

		for(var i = 0; i < this.populationSize; i++) {
			fitness = this.calculateFitness(this.population[i]);
			totalFitness += fitness;

			ig.log(i + " - " + this.population[i].toString() + " - " + fitness);
		}

		ig.log("Total fitness: " + totalFitness);
	},
});

// Start the Game with 60fps, a resolution of 320x240, scaled
// up by a factor of 2
ig.main('#canvas', MyGame, 60, 320, 280, 2);

});
