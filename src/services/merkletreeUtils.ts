import Web3 from 'web3';
import keccak256 from 'keccak256';
import {
  AppMode,
  countOfAgree,
  countOfDisagree,
  currentMode,
  citiSel,
  citizenId,
  totalOpinions,
} from '../constants';
import { IMerkleTreeNode } from '../models/MerkleTreeNode.model';

export const buildProoves = (
  leaves: any[],
  tree,
  data,
  buf2hex,
  keccak256,
): IMerkleTreeNode[] => {
  const proofs: IMerkleTreeNode[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const proof = tree.getProof(keccak256(data[i].hash)).map(({ data }) => {
      switch (currentMode) {
        case AppMode.normal:
          return {
            hash: buf2hex(data.hash),
            numbMandatoryComps: data.numbMandatoryComps,
            numbOptionalComps: data.numbOptionalComps,
          };
        case AppMode.alternative:
          return {
            hash: buf2hex(data.hash),
            citizenId: data.citizenId,
          };
        case AppMode.thesis:
          return {
            hash: buf2hex(data.hash),
            citizenId: data.citizenId,
            citiSel: data.citiSel,
            countOfDisagree: data.countOfDisagree,
            countOfAgree: data.countOfAgree,
          };
      }
    });
    proofs.push(proof);
  }
  return proofs;
};

export const buildRootObj = (root: any, buf2hex: any) => {
  const web3 = new Web3();
  let newRoot: string | null = '';
  switch (currentMode) {
    case AppMode.normal:
      newRoot = web3.utils.encodePacked(
        {
          value: buf2hex(root.hash),
          type: 'bytes32',
        },
        { value: root.numbMandatoryComps, type: 'int32' },
        { value: root.numbOptionalComps, type: 'int32' },
      );
      break;
    case AppMode.alternative:
      newRoot = web3.utils.encodePacked(
        {
          value: buf2hex(root.hash),
          type: 'bytes32',
        },
        { value: Math.floor(root.citizenId).toString(), type: 'int256' },
      );
      break;
    case AppMode.thesis:
      newRoot = web3.utils.encodePacked(
        {
          value: buf2hex(root.hash),
          type: 'bytes32',
        },
        { value: root.citizenId, type: 'int256' },
        { value: root.citiSel, type: 'int256' },
        { value: root.countOfDisagree, type: 'int256' },
        { value: root.countOfAgree, type: 'int256' },
      );
      break;
    default:
      newRoot = '';
  }
  console.log(newRoot);
  return buf2hex(keccak256(newRoot || ''));
};

export const getAllContractData = async (MyContract, sections) => {
  const results = {};

  for (const section of sections) {
    let result;

    switch (section) {
      case citizenId:
        result = await MyContract.methods.ProcessCitizenId().call();
        break;
      case citiSel:
        result = await MyContract.methods.CitiSel().call();
        break;
      case totalOpinions:
        result = await MyContract.methods.TotalOpinions().call();
        break;
      case countOfDisagree:
        result = await MyContract.methods.CountOfDisagree().call();
        break;
      case countOfAgree:
        result = await MyContract.methods.CountOfAgree().call();
        break;
      default:
        throw new Error('Invalid section');
    }
    results[section] = result;
  }
  return results;
};

export const validateReceipt = async (MyContract, receiptContent) => {
  let isValid: boolean = true;
  for (let property of Object.keys(receiptContent)) {
    let data;
    switch (property) {
      case totalOpinions:
        data = await MyContract.methods.TotalOpinions().call();
        break;
      case countOfDisagree:
        data = await MyContract.methods.CountOfDisagree().call();
        break;
      case countOfAgree:
        data = await MyContract.methods.CountOfAgree().call();
        break;
      default:
        break;
    }

    if (data !== undefined)
      isValid = data == receiptContent[property]
    else {
      // skip properties not in contract
      continue;
    }
    console.log(property, data, receiptContent[property])
    if (!isValid) break;
  };

  return isValid;
};

// export const getCitizenId = async MyContract => {
//   const result = await MyContract.methods.ProcessCitizenId().call();
//   console.log('getCitizenId func: ', result);
//   return result;
// }

// export const getcitiSel = async MyContract => {
//   const result = await MyContract.methods.CitiSel().call();
//   console.log('getcitiSel func: ', result);
//   return result;
// }

// export const getTotalOpinions = async MyContract => {
//   const result = await MyContract.methods.TotalOpinions().call();
//   console.log('getTotalOpinions func: ', result);
//   return result;
// }
