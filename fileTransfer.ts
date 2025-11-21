import { Context, Contract } from 'fabric-contract-api';

export interface FileAsset {
  fileId: string;
  filename: string;
  owner: string; // MSP ID of owner
  ipfsCid: string; // IPFS content identifier (hash)
  allowedOrgs: string[]; // Organizations that can access this file
  multiSigRequired: boolean; // If true, edits require all required orgs to approve
  requiredOrgs?: string[]; // Orgs that must approve edits (only if multiSigRequired=true)
  editApprovals?: { [mspId: string]: boolean }; // Tracks which orgs have approved current edit
  editRejections?: { [mspId: string]: boolean }; // Tracks which orgs have rejected current edit
  editProposal?: {
    proposedIpfsCid: string;
    proposedSize: number;
    proposedMetadata?: string;
    proposedBy: string;
    proposedAt: string;
  };
  size: number; // File size in bytes
  createdAt: string; // ISO timestamp
  metadata?: string; // JSON string for extensibility (e.g., tags, description)
  updatedAt?: string; // ISO timestamp of last update
  version?: number; // Optional versioning
  editedLines?: number[];
  editedBy?: string; // MSP ID of last editor
}

export class FileTransfer extends Contract {
  /**
   * InitLedger initializes the ledger with sample file assets for testing
   */
  async InitLedger(ctx: Context): Promise<string> {
    const sampleFiles: FileAsset[] = [
      {
        fileId: 'file-001',
        filename: 'quarterly-report-2025-Q1.pdf',
        owner: 'Org1MSP',
        ipfsCid: 'QmVG4c1gP4xP1L8YXyQ9u3f8B7Q9vQ1Z6rT4sF9eK3mH2n',
        allowedOrgs: ['Org1MSP', 'Org2MSP'],
        multiSigRequired: false,
        requiredOrgs: undefined,
        editApprovals: {},
        size: 245000,
        metadata: JSON.stringify({
          type: 'financial',
          department: 'finance',
          confidential: false,
        }),
        createdAt: new Date('2025-01-15T10:30:00Z').toISOString(),
        updatedAt: new Date('2025-01-20T14:22:00Z').toISOString(),
      },
      {
        fileId: 'file-002',
        filename: 'contract-partnership-agreement.pdf',
        owner: 'Org1MSP',
        ipfsCid: 'QmW5d2eR5gU4vW3xP2qY8sT0vU1wX2yZ3aB4cD5eF6gH7i',
        allowedOrgs: ['Org1MSP', 'Org2MSP', 'Org3MSP'],
        multiSigRequired: true,
        requiredOrgs: ['Org1MSP', 'Org2MSP', 'Org3MSP'],
        editApprovals: {},
        size: 156000,
        metadata: JSON.stringify({
          type: 'legal',
          department: 'legal',
          confidential: true,
          contractType: 'partnership',
        }),
        createdAt: new Date('2025-02-01T09:15:00Z').toISOString(),
      },
      {
        fileId: 'file-003',
        filename: 'data-sharing-agreement.docx',
        owner: 'Org2MSP',
        ipfsCid: 'QmX6e3fS6hV5wX4yZ9aU0bV2cW3xY4zZ5aA6bB7cC8dD9e',
        allowedOrgs: ['Org1MSP', 'Org2MSP'],
        multiSigRequired: false,
        requiredOrgs: undefined,
        editApprovals: {},
        size: 89000,
        metadata: JSON.stringify({
          type: 'agreement',
          department: 'operations',
          confidential: true,
        }),
        createdAt: new Date('2025-02-10T11:45:00Z').toISOString(),
        updatedAt: new Date('2025-03-05T16:20:00Z').toISOString(),
      },
      {
        fileId: 'file-004',
        filename: 'security-audit-report.xlsx',
        owner: 'Org1MSP',
        ipfsCid: 'QmY7f4gT7iW6xY5zZ0aA1bB2cC3dD4eE5fF6gG7hH8iI9j',
        allowedOrgs: ['Org1MSP', 'Org2MSP', 'Org3MSP'],
        multiSigRequired: true,
        requiredOrgs: ['Org1MSP', 'Org2MSP'],
        editApprovals: {},
        size: 523000,
        metadata: JSON.stringify({
          type: 'security',
          department: 'security',
          confidential: true,
          severity: 'critical',
        }),
        createdAt: new Date('2025-03-01T08:00:00Z').toISOString(),
      },
      {
        fileId: 'file-005',
        filename: 'product-roadmap-2025.pptx',
        owner: 'Org2MSP',
        ipfsCid: 'QmZ8g5hU8jX7yY6zZ1aA0bB1cC2dD3eE4fF5gG6hH7iI8j',
        allowedOrgs: ['Org1MSP', 'Org2MSP'],
        multiSigRequired: false,
        requiredOrgs: undefined,
        editApprovals: {},
        size: 412000,
        metadata: JSON.stringify({
          type: 'product',
          department: 'product',
          confidential: true,
        }),
        createdAt: new Date('2025-02-20T13:30:00Z').toISOString(),
        updatedAt: new Date('2025-03-10T10:15:00Z').toISOString(),
      },
      {
        fileId: 'file-006',
        filename: 'multi-org-governance-policy.pdf',
        owner: 'Org1MSP',
        ipfsCid: 'QmA9h6iV9kY8zZ7aA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1k',
        allowedOrgs: ['Org1MSP', 'Org2MSP', 'Org3MSP'],
        multiSigRequired: true,
        requiredOrgs: ['Org1MSP', 'Org2MSP', 'Org3MSP'],
        editApprovals: {},
        size: 234000,
        metadata: JSON.stringify({
          type: 'governance',
          department: 'compliance',
          confidential: false,
          updateFrequency: 'quarterly',
        }),
        createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2025-03-15T09:45:00Z').toISOString(),
      },
      {
        fileId: 'file231',
        filename: 'document.pdf',
        owner: 'orgMSP',
        ipfsCid: 'QmXyz123asdf',
        allowedOrgs: ['orgMSP'],
        multiSigRequired: false,
        requiredOrgs: undefined,
        editApprovals: {},
        size: 1024,
        metadata: JSON.stringify({
          type: 'document',
          description: 'Sample document',
        }),
        createdAt: new Date('2025-11-20T10:30:00Z').toISOString(),
      },
    ];

    // Insert all sample files into state
    for (const file of sampleFiles) {
      await ctx.stub.putState(file.fileId, Buffer.from(JSON.stringify(file)) as Uint8Array);
      console.log(`Initialized file: ${file.fileId} - ${file.filename}`);
    }

    console.log('='.repeat(50));
    console.log('Ledger initialized with 7 sample files:');
    console.log('='.repeat(50));
    sampleFiles.forEach((file, index) => {
      console.log(
        `${index + 1}. ${file.fileId} - ${file.filename} (Owner: ${file.owner}, MultiSig: ${file.multiSigRequired})`
      );
    });
    console.log('='.repeat(50));

    return `Ledger initialized successfully with ${sampleFiles.length} sample files`;
  }

  /**
   * CreateFile creates a new file asset on the ledger
   * @param ctx Transaction context
   * @param fileId Unique file identifier
   * @param filename Human-readable filename
   * @param ipfsCid IPFS content identifier (hash of file)
   * @param size File size in bytes
   * @param allowedOrgsStr JSON string of allowed org MSP IDs
   * @param multiSigRequired boolean - if true, edits require all-party approval
   * @param requiredOrgsStr JSON string of org MSP IDs required to approve edits (if multiSigRequired=true)
   * @param metadata Optional JSON metadata string
   * @param createdAt Optional ISO timestamp of creation
   */
  async CreateFile(
    ctx: Context,
    fileId: string,
    filename: string,
    ipfsCid: string,
    size: string,
    allowedOrgsStr: string,
    multiSigRequired: string,
    createdAt: string,
    requiredOrgsStr?: string,
    metadata?: string
  ): Promise<string> {
    const owner = ctx.clientIdentity.getMSPID();
    const allowedOrgs: string[] = JSON.parse(allowedOrgsStr);
    const multiSig = multiSigRequired === 'true';
    let requiredOrgs: string[] | undefined;

    if (multiSig && requiredOrgsStr) {
      requiredOrgs = JSON.parse(requiredOrgsStr);
    }

    // Check if file already exists
    const existingFile = await ctx.stub.getState(fileId);
    if (existingFile && existingFile.length > 0) {
      throw new Error(`File ${fileId} already exists`);
    }

    const fileAsset: FileAsset = {
      fileId,
      filename,
      owner,
      ipfsCid,
      allowedOrgs,
      multiSigRequired: multiSig,
      requiredOrgs,
      editApprovals: {},
      size: parseInt(size),
      metadata,
      createdAt: createdAt || new Date().toISOString(),
      version: 1,
      editedBy: owner,
    };

    await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);
    return `File ${fileId} created successfully`;
  }

  /**
   * ReadFile retrieves file asset details
   * Only allowed orgs can read
   */
  async ReadFile(ctx: Context, fileId: string): Promise<FileAsset> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (!fileAsset.allowedOrgs.includes(callerMSP)) {
      throw new Error(`Access denied for organization ${callerMSP}`);
    }

    return fileAsset;
  }

  /**
   * UpdateFile updates file content
   * - For ordinary files: allowed orgs can update directly
   * - For important files: records approval; update applied once all required orgs approve
   */
  async UpdateFile(
    ctx: Context,
    fileId: string,
    newIpfsCid: string,
    newSize: string,
    metadata?: string
  ): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    // Access control: caller must be in allowedOrgs
    if (!fileAsset.allowedOrgs.includes(callerMSP)) {
      throw new Error(`Access denied for organization ${callerMSP}`);
    }

    // Ordinary file: allow immediate update
    if (!fileAsset.multiSigRequired) {
      fileAsset.ipfsCid = newIpfsCid;
      fileAsset.size = parseInt(newSize);
      fileAsset.metadata = metadata || fileAsset.metadata;
      fileAsset.updatedAt = new Date().toISOString();
      
      // Update version: increment by 0.1 until x.10, then increment major version
      const currentVersion = fileAsset.version || 1;
      const major = Math.floor(currentVersion);
      const minor = Math.round((currentVersion - major) * 10);
      if (minor >= 9) {
        fileAsset.version = major + 1;
      } else {
        fileAsset.version = parseFloat((major + (minor + 1) / 10).toFixed(1));
      }
      
      fileAsset.editedBy = callerMSP;
      await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);
      return `File ${fileId} updated successfully`;
    }

    // Important file: track approval and apply update when all orgs approve
    if (!fileAsset.requiredOrgs || fileAsset.requiredOrgs.length === 0) {
      throw new Error('Multi-sig required but requiredOrgs not set');
    }

    // Initialize approvals if not present
    if (!fileAsset.editApprovals) {
      fileAsset.editApprovals = {};
    }

    // Store the proposed edit
    fileAsset.editProposal = {
      proposedIpfsCid: newIpfsCid,
      proposedSize: parseInt(newSize),
      proposedMetadata: metadata,
      proposedBy: callerMSP,
      proposedAt: new Date().toISOString(),
    };

    // Record this org's approval
    fileAsset.editApprovals[callerMSP] = true;

    // Check if all required orgs have approved
    const allApproved = fileAsset.requiredOrgs.every(
      (org) => !!fileAsset.editApprovals && fileAsset.editApprovals[org]
    );

    if (allApproved) {
      // Apply the update
      fileAsset.ipfsCid = newIpfsCid;
      fileAsset.size = parseInt(newSize);
      fileAsset.metadata = metadata || fileAsset.metadata;
      fileAsset.updatedAt = new Date().toISOString();
      
      // Update version: increment by 0.1 until x.10, then increment major version
      const currentVersion = fileAsset.version || 1;
      const major = Math.floor(currentVersion);
      const minor = Math.round((currentVersion - major) * 10);
      if (minor >= 9) {
        fileAsset.version = major + 1;
      } else {
        fileAsset.version = parseFloat((major + (minor + 1) / 10).toFixed(1));
      }
      
      fileAsset.editedBy = callerMSP;

      // Reset approvals for next edit cycle
      fileAsset.editApprovals = {};
      fileAsset.editProposal = undefined;

      await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);
      return `Important file ${fileId} updated with approval from all required organizations`;
    } else {
      // Wait for more approvals
      await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);
      const approvedCount = Object.keys(fileAsset.editApprovals).length;
      const totalRequired = fileAsset.requiredOrgs.length;
      return `Approval recorded from ${callerMSP}. ${approvedCount}/${totalRequired} organizations approved.`;
    }
  }

  /**
   * GetEditApprovals returns the current edit approval status for a file
   */
  async GetEditApprovals(ctx: Context, fileId: string): Promise<any> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());

    if (!fileAsset.multiSigRequired) {
      throw new Error('File does not require multi-sig approval');
    }

    return {
      fileId,
      editProposal: fileAsset.editProposal,
      editApprovals: fileAsset.editApprovals,
      requiredOrgs: fileAsset.requiredOrgs,
      approvalStatus: fileAsset.requiredOrgs!.map((org) => ({
        org,
        approved: !!fileAsset.editApprovals && fileAsset.editApprovals[org],
      })),
    };
  }

  /**
   * DoesFileExist checks if a file exists
   */
  async DoesFileExist(ctx: Context, fileId: string): Promise<boolean> {
    const fileBytes = await ctx.stub.getState(fileId);
    return !!fileBytes && fileBytes.length > 0;
  }

  /**
   * TransferFileOwnership transfers file ownership to a new owner
   * Only the current owner can transfer
   */
  async TransferFileOwnership(
    ctx: Context,
    fileId: string,
    newOwner: string
  ): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (fileAsset.owner !== callerMSP) {
      throw new Error(
        `Only owner (${fileAsset.owner}) can transfer ownership`
      );
    }

    fileAsset.owner = newOwner;
    fileAsset.updatedAt = new Date().toISOString();
    await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);

    return `Ownership of file ${fileId} transferred to ${newOwner}`;
  }

  /**
   * UpdateAccessControl updates which organizations can access a file
   * Only the owner can update access control
   */
  async UpdateAccessControl(
    ctx: Context,
    fileId: string,
    allowedOrgsStr: string
  ): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (fileAsset.owner !== callerMSP) {
      throw new Error(`Only owner can update access control`);
    }

    const newAllowedOrgs: string[] = JSON.parse(allowedOrgsStr);
    fileAsset.allowedOrgs = newAllowedOrgs;
    fileAsset.updatedAt = new Date().toISOString();
    await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);

    return `Access control for file ${fileId} updated`;
  }

  /**
   * DeleteFile removes a file record from the ledger
   * Only the owner can delete
   */
  async DeleteFile(ctx: Context, fileId: string): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (fileAsset.owner !== callerMSP) {
      throw new Error(`Only owner can delete file`);
    }

    await ctx.stub.deleteState(fileId);
    return `File ${fileId} deleted successfully`;
  }

  /**
   * GetAllFiles returns all files (caller should verify access in application)
   */
  async GetAllFiles(ctx: Context): Promise<FileAsset[]> {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results: FileAsset[] = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const asset: FileAsset = JSON.parse(res.value.value.toString());
          results.push(asset);
        } catch (err) {
          console.error('Error parsing asset:', err);
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return results;
  }

  /**
   * GetFilesByOrganization returns all files accessible to a specific organization
   */
  async GetFilesByOrganization(ctx: Context, orgMSP?: string): Promise<FileAsset[]> {
    const targetOrg = orgMSP || ctx.clientIdentity.getMSPID();
    const iterator = await ctx.stub.getStateByRange('', '');
    const results: FileAsset[] = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const asset: FileAsset = JSON.parse(res.value.value.toString());
          if (asset.allowedOrgs.includes(targetOrg)) {
            results.push(asset);
          }
        } catch (err) {
          console.error('Error parsing asset:', err);
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return results;
  }

  /**
   * GetFileHistory returns transaction history for a file
   */
  async GetFileHistory(ctx: Context, fileId: string): Promise<any[]> {
    const iterator = await ctx.stub.getHistoryForKey(fileId);
    const results: any[] = [];

    while (true) {
      const res = await iterator.next();
      if (res.value) {
        results.push({
          timestamp: res.value.timestamp,
          isDelete: res.value.isDelete,
          value: res.value.value.toString(),
        });
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return results;
  }

  /**
   * RejectEdit rejects a proposed edit for a multi-sig file
   * Any required org can reject, which cancels the entire proposal
   */
  async RejectEdit(ctx: Context, fileId: string): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (!fileAsset.multiSigRequired) {
      throw new Error('File does not require multi-sig approval');
    }

    if (!fileAsset.requiredOrgs || !fileAsset.requiredOrgs.includes(callerMSP)) {
      throw new Error(`Organization ${callerMSP} is not authorized to reject edits`);
    }

    if (!fileAsset.editProposal) {
      throw new Error('No pending edit proposal to reject');
    }

    // Record rejection and cancel the proposal
    const rejectedBy = callerMSP;
    
    // Clear the proposal and all approvals/rejections
    fileAsset.editApprovals = {};
    fileAsset.editRejections = {};
    fileAsset.editProposal = undefined;
    
    await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);

    return `Edit proposal for file ${fileId} rejected by ${rejectedBy}. Proposal cancelled.`;
  }

  /**
   * ResetEditApprovals resets edit approvals for a file (for testing/admin purposes)
   * Only the owner can reset approvals
   */
  async ResetEditApprovals(ctx: Context, fileId: string): Promise<string> {
    const fileBytes = await ctx.stub.getState(fileId);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error(`File ${fileId} not found`);
    }

    const fileAsset: FileAsset = JSON.parse(fileBytes.toString());
    const callerMSP = ctx.clientIdentity.getMSPID();

    if (fileAsset.owner !== callerMSP) {
      throw new Error(`Only owner can reset approvals`);
    }

    if (!fileAsset.multiSigRequired) {
      throw new Error('File does not require multi-sig approvals');
    }

    fileAsset.editApprovals = {};
    fileAsset.editRejections = {};
    fileAsset.editProposal = undefined;
    await ctx.stub.putState(fileId, Buffer.from(JSON.stringify(fileAsset)) as Uint8Array);

    return `Edit approvals for file ${fileId} reset successfully`;
  }
}

export const contracts: any[] = [FileTransfer];
