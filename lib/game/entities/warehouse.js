ig.module(
	'game.entities.warehouse'
)
.requires(
	'impact.entity'
)
.defines(function(){

EntityWarehouse = ig.Entity.extend({
	size: {
		x: 8,
		y: 8
	},

	animSheet: new ig.AnimationSheet('media/warehouse.png', 8, 8),

	init: function(x, y, settings) {
		this.addAnim('idle', 1, [0]);

		this.parent(x, y, settings);
	},

	update: function() {
		if(!ig.game.running) {
			this.dragAndDrop(false, false);
		}
		this.parent();
	}
});

});