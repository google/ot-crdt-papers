// Copyright 2016 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// A testbed for operational transformation ideas.

function size_of(tree) {
	return tree == null ? 0 : tree.size;
}

function xi(tree, i) {
	var base = 0;
	while (tree != null) {
		var left = tree.left;
		var x = tree.value - size_of(left);
		if (i < x) {
			tree = left;
		} else {
			i = 1 + i - x;
			base += tree.value;
			tree = tree.right;
		}
	}
	return base + i;
}

// precondition: i is not a member of the set
function xi_inv(tree, i) {
	var result = i;
	var x = 0;
	while (tree != null) {
		if (i < tree.value) {
			tree = tree.left;
		} else {
			i -= tree.value;
			result -= size_of(tree.left) + 1;
			tree = tree.right;
		}
	}
	return result;
}

function contains(tree, i) {
	while (tree != null) {
		if (i < tree.value) {
			tree = tree.left;
		} else if (i == tree.value) {
			return true;
		} else { // i > tree.value
			i -= tree.value;
			tree = tree.right;
		}
	}
	return false;
}

function mk_tree_raw(left, value, right) {
	var size = size_of(left) + 1 + size_of(right);
	var left_height = left == null ? 0 : left.height;
	var right_height = right == null ? 0 : right.height;
	var height = Math.max(left_height, right_height) + 1;
	return {left: left, value: value, right: right, size: size, height: height};
}

function mk_tree(left, value, right) {
	var left_height = left == null ? 0 : left.height;
	var right_height = right == null ? 0 : right.height;
	if (left_height > right_height + 1) {
		// unbalanced, rotate right
		var new_right = mk_tree_raw(left.right, value - left.value, right);
		return mk_tree_raw(left.left, left.value, new_right);
	} else if (right_height > left_height + 1) {
		// unbalanced, rotate left
		var new_left = mk_tree_raw(left, value, right.left);
		return mk_tree_raw(new_left, value + right.value, right.right);
	}
	return mk_tree_raw(left, value, right);
}

function union_one(tree, i) {
	if (tree == null) {
		return mk_tree(null, i, null);
	} else if (i < tree.value) {
		var left_union = union_one(tree.left, i);
		return mk_tree(left_union, tree.value, tree.right);
	} else if (i == tree.value) {
		return tree;
	} else {  // i > tree.value
		var right_union = union_one(tree.right, i - tree.value);
		return mk_tree(tree.left, tree.value, right_union);
	}
}

// \Xi_{i}(S)
function xi_one(tree, i) {
	if (tree == null) {
		return null;
	} else if (i <= tree.value) {
		var left_seq = xi_one(tree.left, i);
		return mk_tree(left_seq, tree.value + 1, tree.right);
	} else {
		var right_seq = xi_one(tree.right, i - tree.value);
		return mk_tree(tree.left, tree.value, right_seq);
	}
}


// for debugging
function to_array(tree) {
	var result = [];
	function rec(tree, base) {
		if (tree != null) {
			rec(tree.left, base);
			base += tree.value;
			result.push(base);
			rec(tree.right, base);
		}
	}
	rec(tree, 0);
	return result;
}

function tree_toy() {
	tree = null;
	tree = union_one(tree, 7);
	tree = union_one(tree, 2);
	tree = union_one(tree, 0);
	tree = union_one(tree, 2);
	tree = union_one(tree, 3);
	for (var i = 200; i > 100; i--) {
		tree = union_one(tree, i);
	}
	console.log(to_array(tree));
	console.log(tree.size, tree.height);
	for (var i = 0; i < 10; i++) {
		console.log(i, xi(tree, i), xi_inv(tree, xi(tree, i)), contains(tree, i));
	}
	console.log(to_array(xi_one(tree, 5)));
}

//tree_toy();

// transformations of operations
// All operations have 'ty' and 'ix' properties
// also 'id'
// sample operations:
// {ty: 'ins', ix: 1, ch: 'x', pri: 0}
// {ty: 'del', ix: 1}

// Note: mutating in place is appealing, to avoid allocations.
function transform(op1, op2) {
	if (op2.ty != 'ins') { return op1; }
	return transform_ins(op1, op2.ix, op2.pri);
}

function transform_ins(op1, ix, pri) {
	if (op1.ty == 'ins') {
		if (op1.ix < ix || (op1.ix == ix && op1.pri < pri)) {
			return op1;
		}
		return {ty: op1.ty, ix: op1.ix + 1, ch: op1.ch, pri: op1.pri, id: op1.id};
	} else { // op1.ty is del
		if (op1.ix < ix) {
			return op1;
		}
		return {ty: op1.ty, ix: op1.ix + 1, id: op1.id};
	}
}

class DocState {
	constructor() {
		this.ops = [];
		this.dels = null;
		this.str = "";
        this.points = [];  // in user-visible string coordinates
	}

	add(op) {
		this.ops.push(op);
		if (op.ty == 'del') {
			if (!contains(this.dels, op.ix)) {
				var ix = xi_inv(this.dels, op.ix);
				this.dels = union_one(this.dels, op.ix);
				this.str = this.str.slice(0, ix) + this.str.slice(ix + 1);
                for (var i = 0; i < this.points.length; i++) {
                    if (this.points[i] > ix) {
                        this.points[i] -= 1;
                    }
                }
			}
		} else if (op.ty == 'ins') {
			this.dels = xi_one(this.dels, op.ix);
			var ix = xi_inv(this.dels, op.ix);
			this.str = this.str.slice(0, ix) + op.ch + this.str.slice(ix);
            for (var i = 0; i < this.points.length; i++) {
                if (this.points[i] > ix) {
                    this.points[i] += 1;
                }
            }
		}
	}

    xform_ix(ix) {
        return xi(this.dels, ix);
    }

    get_str() {
        return this.str;
    }
}

class Peer {
	constructor() {
		this.rev = 0;
		this.context = new Set();
	}

	merge_op(doc_state, op) {
		var id = op.id;
		var ops = doc_state.ops;
		if (this.rev < ops.length && ops[this.rev].id == id) {
			// we already have this, roll rev forward
			this.rev++;
			while (this.rev < ops.length && this.context.has(ops[this.rev].id)) {
				this.context.delete(ops[this.rev].id);
				this.rev++;
			}
			return;
		}
		for (var ix = this.rev; ix < ops.length; ix++) {
			if (ops[ix].id == id) {
				// we already have this, but can't roll rev forward
				this.context.add(id);
				return;
			}
		}
		// we don't have it, need to merge
		var ins_list = [];
		var S = null;
		var T = null;
		for (var ix = ops.length - 1; ix >= this.rev; ix--) {
			var my_op = ops[ix];
			if (my_op.ty == 'ins') {
				var i = xi(S, my_op.ix);
				if (!this.context.has(my_op.id)) {
					ins_list.push([xi_inv(T, i), my_op.pri]);
					T = union_one(T, i);
				}
				S = union_one(S, i);
			}
		}
		for (var i = ins_list.length - 1; i >= 0; i--) {
			op = transform_ins(op, ins_list[i][0], ins_list[i][1]);
		}
        var current = (this.rev == ops.length);
		doc_state.add(op);
        if (current) {
            this.rev++;
        } else {
            this.context.add(id);
        }
	}
}

// Export as a module for node, but don't bother namespacing for browser
if (typeof exports !== 'undefined') {
    exports.DocState = DocState;
    exports.Peer = Peer;
}
