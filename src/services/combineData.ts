import { IMerkleTreeNode } from '../models/MerkleTreeNode.model';

export const combineData = (
  hash: Buffer,
  left: IMerkleTreeNode,
  right: IMerkleTreeNode,
): Partial<IMerkleTreeNode> => {
  return {
    hash,
    citizenId: left.citizenId + right.citizenId,
    citiSel: left.citiSel + right.citiSel,
    countOfDisagree: left.countOfDisagree + right.countOfDisagree,
    countOfAgree: left.countOfAgree + right.countOfAgree,
  };
};
