import { AppMode, currentMode } from '../../constants';

import CryptoJS from 'crypto-js';
import treeify from 'treeify';
import { combineData } from '../../services/combineData';

// FIXME: Move this to another file
function reverse(src) {
  var buffer = Buffer.allocUnsafe(src.length);

  for (var i = 0, j = src.length - 1; i <= j; ++i, --j) {
    buffer[i] = src[j];
    buffer[j] = src[i];
  }

  return buffer;
}

interface Options {
  /** If set to `true`, an odd node will be duplicated and combined to make a pair to generate the layer hash. */
  duplicateOdd?: boolean;
  /** If set to `true`, the leaves will hashed using the set hashing algorithms. */
  hashLeaves?: boolean;
  /** If set to `true`, constructs the Merkle Tree using the [Bitcoin Merkle Tree implementation](http://www.righto.com/2014/02/bitcoin-mining-hard-way-algorithms.html). Enable it when you need to replicate Bitcoin constructed Merkle Trees. In Bitcoin Merkle Trees, single nodes are combined with themselves, and each output hash is hashed again. */
  isBitcoinTree?: boolean;
  /** If set to `true`, the leaves will be sorted. */
  sortLeaves?: boolean;
  /** If set to `true`, the hashing pairs will be sorted. */
  sortPairs?: boolean;
  /** If set to `true`, the leaves and hashing pairs will be sorted. */
  sort?: boolean;
}

interface Proof {
  data: Buffer;
  position: string;
}

declare type THashAlgo = any;
declare type TValue = any;
declare type TLeaf = any;
declare type TLayer = any;

class MerkleTree {
  duplicateOdd: boolean;
  hashAlgo: (value: TValue) => THashAlgo;
  hashLeaves: boolean;
  isBitcoinTree: boolean;
  leaves: TLeaf[];
  layers: TLayer[];
  sortLeaves: boolean;
  sortPairs: boolean;
  sort: boolean;

  constructor(leaves: Buffer[], hashAlgorithm: any, options) {
    if (options === void 0) {
      options = {};
    }
    this.isBitcoinTree = !!options.isBitcoinTree;
    this.hashLeaves = !!options.hashLeaves;
    this.sortLeaves = !!options.sortLeaves;
    this.sortPairs = !!options.sortPairs;
    this.sort = !!options.sort;
    if (this.sort) {
      this.sortLeaves = true;
      this.sortPairs = true;
    }
    this.duplicateOdd = !!options.duplicateOdd;
    this.hashAlgo = bufferifyFn(hashAlgorithm);
    if (this.hashLeaves) {
      leaves = leaves.map(this.hashAlgo);
    }
    this.leaves = leaves.map(bufferify);
    if (this.sortLeaves) {
      this.leaves = this.leaves.sort((a, b) => Buffer.compare(a.hash, b.hash));
    }
    this.layers = [this.leaves];

    this.createHashes(this.leaves);
  }

  createHashes(nodes) {
    while (nodes.length > 1) {
      var layerIndex = this.layers.length;
      this.layers.push([]);
      for (var i = 0; i < nodes.length; i += 2) {
        if (i + 1 === nodes.length) {
          if (nodes.length % 2 === 1) {
            var data_1 = nodes[nodes.length - 1];
            var hash_1 = data_1;
            // is bitcoin tree
            if (this.isBitcoinTree) {
              // Bitcoin method of duplicating the odd ending nodes
              data_1 = Buffer.concat([reverse(data_1), reverse(data_1)]);
              hash_1 = this.hashAlgo(data_1);
              hash_1 = reverse(this.hashAlgo(hash_1));
              this.layers[layerIndex].push(hash_1);
              continue;
            } else {
              if (!this.duplicateOdd) {
                this.layers[layerIndex].push(nodes[i]);
                continue;
              }
            }
          }
        }
        let left = nodes[i];
        let right = i + 1 == nodes.length ? left : nodes[i + 1];
        let data;
        let combined: Buffer[];
        //Quan - Need to do
        if (this.isBitcoinTree) {
          combined = [reverse(left), reverse(right)];
        } else {
          // combine 2 objects
          combined = [left.hash, right.hash];
        }
        if (this.sortPairs) {
          combined.sort(Buffer.compare);
        }

        let hash = this.hashAlgo(Buffer.concat(combined));

        // double hash if bitcoin tree
        if (this.isBitcoinTree) {
          hash = reverse(this.hashAlgo(hash));
        }
        data = combineData(hash, left, right);

        this.layers[layerIndex].push(data);
      }
      nodes = this.layers[layerIndex];
    }
    console.log(this.layers);
  }

  verify(proof: Proof[], targetNode: Buffer, root: Buffer): boolean {
    var hash = bufferify(targetNode);
    root = bufferify(root);
    if (!Array.isArray(proof) || !proof.length || !targetNode || !root) {
      return false;
    }
    for (var i = 0; i < proof.length; i++) {
      var node = proof[i];
      var data: Buffer;
      var isLeftNode: boolean;
      // NOTE: case for when proof is hex values only
      if (typeof node === 'string') {
        data = bufferify(node);
        isLeftNode = true;
      } else {
        data = node.data;
        isLeftNode = node.position === 'left';
      }
      var buffers: any = [];
      if (this.isBitcoinTree) {
        buffers.push(reverse(hash));
        buffers[isLeftNode ? 'unshift' : 'push'](reverse(data));
        hash = this.hashAlgo(Buffer.concat(buffers));
        hash = reverse(this.hashAlgo(hash));
      } else {
        if (this.sortPairs) {
          if (Buffer.compare(hash, data) === -1) {
            buffers.push(hash, data);
            hash = this.hashAlgo(Buffer.concat(buffers));
          } else {
            buffers.push(data, hash);
            hash = this.hashAlgo(Buffer.concat(buffers));
          }
        } else {
          buffers.push(hash);
          buffers[isLeftNode ? 'unshift' : 'push'](data);
          hash = this.hashAlgo(Buffer.concat(buffers));
        }
      }
    }
    return Buffer.compare(hash, root) === 0;
  }

  getLayers() {
    return this.layers;
  }

  getHexRoot() {
    return bufferToHex(this.getRoot());
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0] || Buffer.from([]);
  }

  getProof(leaf: any, index?: any) {
    leaf = bufferify(leaf);
    var proof: any[] = [];
    if (typeof index !== 'number') {
      index = -1;
      for (var i = 0; i < this.leaves.length; i++) {
        if (Buffer.compare(leaf, this.leaves[i].hash) === 0) {
          index = i;
        }
      }
    }
    if (index <= -1) {
      return [];
    }
    if (this.isBitcoinTree && index === this.leaves.length - 1) {
      // Proof Generation for Bitcoin Trees
      for (var i = 0; i < this.layers.length - 1; i++) {
        var layer = this.layers[i];
        var isRightNode = index % 2;
        var pairIndex = isRightNode ? index - 1 : index;
        if (pairIndex < layer.length) {
          proof.push({
            data: layer[pairIndex],
          });
        }
        // set index to parent index
        index = (index / 2) | 0;
      }
      return proof;
    } else {
      // Proof Generation for Non-Bitcoin Trees
      for (var i = 0; i < this.layers.length; i++) {
        var layer = this.layers[i];
        var isRightNode = index % 2;
        var pairIndex = isRightNode ? index - 1 : index + 1;
        if (pairIndex < layer.length) {
          proof.push({
            position: isRightNode ? 'left' : 'right',
            data: layer[pairIndex],
          });
        }
        // set index to parent index
        index = (index / 2) | 0;
      }
      return proof;
    }
  }

  getLayersAsObject() {
    var _a;
    var layers = this.getLayers().map(function (x) {
      return x.map(function (x) {
        return x.toString('hex');
      });
    });
    var objs: any[] = [];
    for (var i = 0; i < layers.length; i++) {
      var arr: any[] = [];
      for (var j = 0; j < layers[i].length; j++) {
        var obj = ((_a = {}), (_a[layers[i][j]] = null), _a);
        if (objs.length) {
          obj[layers[i][j]] = {};
          let a = objs.shift();
          let akey = Object.keys(a)[0];
          obj[layers[i][j]][akey] = a[akey];
          if (objs.length) {
            var b = objs.shift();
            var bkey = Object.keys(b)[0];
            obj[layers[i][j]][bkey] = b[bkey];
          }
        }
        arr.push(obj);
      }
      objs.push.apply(objs, arr);
    }
    return objs[0];
  }

  // TODO: documentation
  print() {
    console.log(this.toString());
  }

  // TODO: documentation
  toTreeString() {
    var obj = this.getLayersAsObject();
    return treeify.asTree(obj, true);
  }
  // TODO: documentation
  toString() {
    return this.toTreeString();
  }
  // TODO: documentation
  bufferify(x) {
    return bufferify(x);
  }
}

function bufferToHex(value) {
  return '0x' + value.toString('hex');
}
function bufferify(x) {
  if (!Buffer.isBuffer(x)) {
    // crypto-js support
    if (typeof x === 'object' && x.words) {
      return Buffer.from(x.toString(CryptoJS.enc.Hex), 'hex');
    } else if (isHexStr(x)) {
      return Buffer.from(x.replace(/^0x/, ''), 'hex');
    } else if (typeof x === 'string') {
      return Buffer.from(x);
    }
  }
  return x;
}

function bufferifyFn(f) {
  return function (x) {
    var v = f(x);
    if (Buffer.isBuffer(v)) {
      return v;
    }
    if (isHexStr(v)) {
      return Buffer.from(v, 'hex');
    }
    // crypto-js support
    return Buffer.from(
      f(CryptoJS.enc.Hex.parse(x.toString('hex'))).toString(CryptoJS.enc.Hex),
      'hex',
    );
  };
}
function isHexStr(v) {
  return typeof v === 'string' && /^(0x)?[0-9A-Fa-f]*$/.test(v);
}

export default MerkleTree;
