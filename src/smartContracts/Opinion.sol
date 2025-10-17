//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;
import './Ownable.sol';


contract Opinion is Ownable {
  bytes32 public immutable institute;
  bytes32 public immutable MTRoot;
  int32 public immutable YearOfGraduation; 
  bytes32 public immutable description;
 // int32 public immutable NumbMandatory;
 // int32 public immutable NumbOptional;
  int256 public immutable ProcessCitizenId;
  int256 public immutable CitiSel;
  int256 public immutable TotalOpinions;
  int256 public immutable CountOfDisagree;
  int256 public immutable CountOfAgree;

  struct leafInfo {
    bytes32 hash;
    int32 numbMandatoryComps;
    int32 numbOptionalComps;
  }

  struct leafInfo2 {
    bytes32 hash;
    int256 citizenId;
  }

  struct leafInfo3 {
    bytes32 hash;
    int256 citizenId;
    int256 citiSel;
    int256 countOfDisagree;
    int256 countOfAgree;
  }

  mapping(bytes32 => string) revocationList;

  constructor(
    bytes32 _institute,
    bytes32 _MTRoot,
    int32 _yearOfGraduation,
    string memory _description,
    //int32 _numbMandatory,
    //int32 _numbOptional,
    int256 _processCitizenId,
    int256 _citiSel,
    int256 _countOfDisagree,
    int256 _countOfAgree,
    int256 _totalOpinions
  ) {
    institute = _institute;
    MTRoot = _MTRoot;
    YearOfGraduation = _yearOfGraduation;
    description = bytes32(abi.encodePacked(_description));
    //NumbMandatory = _numbMandatory;
    //NumbOptional = _numbOptional;
    ProcessCitizenId = _processCitizenId;
    CitiSel = _citiSel;
    CountOfDisagree = _countOfDisagree;
    CountOfAgree = _countOfAgree;
    TotalOpinions = _totalOpinions;
  }

  function revokeCertificate(
    bytes32 credentialMandatoryComponent,
    string memory reason
  ) public onlyOwner {
    revocationList[credentialMandatoryComponent] = reason;
  }

  function isValid(
    bytes32 credentialMandatoryComponent
  ) public view returns (bool, string memory) {
    if (bytes(revocationList[credentialMandatoryComponent]).length > 0) {
      return (false, revocationList[credentialMandatoryComponent]);
    }
    return (true, 'valid');
  }

  function verify(
    leafInfo[] memory proof,
    bytes32 leaf,
    int32 mandatoryComp,
    int32 optionalComp
  ) public view returns (bool) {
    bytes32 computedHash = leaf;
    int32 computedOptionalComps = mandatoryComp;
    int32 computedMandatoryComps = optionalComp;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i].hash;
      int32 numbMandatoryComps = proof[i].numbMandatoryComps;
      int32 numbOptionalComps = proof[i].numbOptionalComps;

      if (computedHash < proofElement) {
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
        computedOptionalComps = computedOptionalComps + numbMandatoryComps;
        computedMandatoryComps = computedMandatoryComps + numbOptionalComps;
      } else {
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
        computedOptionalComps = computedOptionalComps + numbMandatoryComps;
        computedMandatoryComps = computedMandatoryComps + numbOptionalComps;
      }
    }

    computedHash = keccak256(
      abi.encodePacked(
        computedHash,
        computedOptionalComps,
        computedMandatoryComps
      )
    );

    return
      computedHash == MTRoot &&
      computedOptionalComps == mandatoryComp &&
      computedMandatoryComps == optionalComp;
  }

  function alternativeVerify(
    leafInfo2[] memory proof,
    bytes32 leaf,
    int256 citizenId
  ) public view returns (bool) {
    bytes32 computedHash = leaf;
    int256 computedcitizenId = citizenId;
    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i].hash;
      int256 processedCitizenId = proof[i].citizenId;

      if (computedHash < proofElement) {
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
      computedcitizenId =
        sqrt(computedcitizenId * 10000) +
        sqrt(processedCitizenId * 10000);
    }

    computedHash = keccak256(abi.encodePacked(computedHash, computedcitizenId));
    return computedHash == MTRoot && computedcitizenId == ProcessCitizenId;
  }

  function verifyThesis(
    leafInfo3[] memory proof,
    bytes32 leaf,
    int256 citizenId,
    int256 citiSel,
    int256 totalOpinions,
    int256 countOfDisagree,
    int256 countOfAgree
  ) public view returns (bool) {
    bytes32 computedHash = leaf;
    int256 computedcitizenId = citizenId;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i].hash;
      int256 processedCitizenId = proof[i].citizenId;

      if (computedHash < proofElement) {
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
      computedcitizenId = computedcitizenId + processedCitizenId;
      citiSel = citiSel + proof[i].citiSel;
      countOfDisagree = countOfDisagree + proof[i].countOfDisagree;
      countOfAgree = countOfAgree + proof[i].countOfAgree;
    }

    computedHash = keccak256(abi.encodePacked(computedHash, computedcitizenId, citiSel, countOfDisagree, countOfAgree));
    return computedHash == MTRoot
     && computedcitizenId == ProcessCitizenId
     && citiSel == CitiSel
     && countOfDisagree == CountOfDisagree
     && countOfAgree == CountOfAgree
     && totalOpinions == TotalOpinions;
  }

  function sqrt(int x) private pure returns (int y) {
    int z = (x + 1) / 2;
    y = x;
    while (z < y) {
      y = z;
      z = (x / z + z) / 2;
    }
  }

}
