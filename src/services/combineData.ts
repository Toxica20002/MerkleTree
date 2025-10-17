import { AppMode, currentMode } from '../constants';
import { IMerkleTreeNode } from '../models/MerkleTreeNode.model';

export const combineData = (
  hash: Buffer,
  left: IMerkleTreeNode,
  right: IMerkleTreeNode,
): Partial<IMerkleTreeNode> => {
  switch (currentMode) {
    case AppMode.alternative:
      return {
        hash,
        citizenId:
          Math.floor(Math.sqrt(left.citizenId * 10000)) +
          Math.floor(Math.sqrt(right.citizenId * 10000)),
      };
    case AppMode.thesis: // Root Object
      return {
        hash,
        citizenId: left.citizenId + right.citizenId,
        citiSel: left.citiSel + right.citiSel,
        countOfDisagree: left.countOfDisagree + right.countOfDisagree,
        countOfAgree: left.countOfAgree + right.countOfAgree,
      };
  }
};
