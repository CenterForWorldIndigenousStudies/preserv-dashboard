/** Generated from contracts/processing-details.json; do not edit manually. */
export const GENERATED_PROCESSING_DETAILS_CONTRACT = {
  "version": 1,
  "description": "Shared persisted processing-details properties written by pipeline services and data-combiner and read by the dashboard.",
  "conventions": {
    "timestamp": {
      "valueType": "unixTimestamp",
      "description": "Unix timestamp in seconds."
    },
    "duration": {
      "valueType": "durationMilliseconds",
      "description": "Duration in milliseconds."
    },
    "currency": {
      "valueType": "currencyUsd",
      "description": "Monetary value in United States dollars."
    }
  },
  "batch": {
    "properties": {
      "pipeline": {
        "label": "Pipeline",
        "description": "Execution context and history for modern pipeline work.",
        "valueType": "object"
      },
      "legacyImport": {
        "label": "Legacy Import",
        "description": "Historical data-combiner processing and registry metrics.",
        "valueType": "object"
      }
    },
    "patterns": {}
  },
  "stageEntry": {
    "label": "Processing Stage",
    "description": "Status and metrics recorded for one pipeline service stage.",
    "valueType": "object"
  },
  "document": {
    "properties": {},
    "patterns": {}
  },
  "pipeline": {
    "properties": {
      "executionMode": {
        "label": "Execution Mode",
        "description": "The intent of the pipeline execution.",
        "valueType": "string"
      },
      "source": {
        "label": "Source",
        "description": "The system and source information for the execution.",
        "valueType": "object"
      },
      "requestedStages": {
        "label": "Requested Stages",
        "description": "The ordered stages requested for the execution.",
        "valueType": "array"
      },
      "config": {
        "label": "Pipeline Configuration",
        "description": "The pipeline configuration selected for the execution.",
        "valueType": "object"
      },
      "currentExecution": {
        "label": "Current Execution",
        "description": "The execution currently associated with the batch.",
        "valueType": "object"
      },
      "executionHistory": {
        "label": "Execution History",
        "description": "Prior executions associated with the batch.",
        "valueType": "array"
      }
    }
  },
  "stage": {
    "properties": {
      "status": {
        "label": "Status",
        "description": "Current status of this processing stage.",
        "valueType": "string"
      },
      "mode": {
        "label": "Mode",
        "description": "Service-specific processing mode.",
        "valueType": "string"
      },
      "requestId": {
        "label": "Request ID",
        "description": "Identifier for the request that started this stage.",
        "valueType": "string"
      },
      "operationId": {
        "label": "Operation ID",
        "description": "Identifier for the durable operation represented by this stage.",
        "valueType": "string"
      },
      "idempotencyKey": {
        "label": "Idempotency Key",
        "description": "Key used to make repeated stage requests safe.",
        "valueType": "string"
      },
      "executionMode": {
        "label": "Execution Mode",
        "description": "The execution mode used by this stage.",
        "valueType": "string"
      },
      "requestedByApp": {
        "label": "Requested By App",
        "description": "Application that requested this stage.",
        "valueType": "string"
      },
      "initiatedAt": {
        "label": "Initiated At",
        "description": "Unix timestamp in seconds when the stage request was initiated.",
        "valueType": "unixTimestamp"
      },
      "startedAt": {
        "label": "Started At",
        "description": "Unix timestamp in seconds when this stage began processing.",
        "valueType": "unixTimestamp"
      },
      "completedAt": {
        "label": "Completed At",
        "description": "Unix timestamp in seconds when this stage finished processing.",
        "valueType": "unixTimestamp"
      },
      "lastTransitionAt": {
        "label": "Last Transition At",
        "description": "Unix timestamp in seconds when this stage last changed status.",
        "valueType": "unixTimestamp"
      },
      "durationMs": {
        "label": "Duration",
        "description": "Duration of the stage in milliseconds.",
        "valueType": "durationMilliseconds"
      },
      "costUsd": {
        "label": "Cost",
        "description": "Processing cost in United States dollars.",
        "valueType": "currencyUsd"
      },
      "costSavedUsd": {
        "label": "Cost Saved",
        "description": "Estimated processing cost avoided in United States dollars.",
        "valueType": "currencyUsd"
      },
      "aiCostUsd": {
        "label": "AI Cost",
        "description": "AI processing cost in United States dollars.",
        "valueType": "currencyUsd"
      },
      "estimatedCostUsd": {
        "label": "Estimated Cost",
        "description": "Estimated processing cost in United States dollars.",
        "valueType": "currencyUsd"
      },
      "processedCount": {
        "label": "Processed Count",
        "description": "Number of documents processed by this stage.",
        "valueType": "integer"
      },
      "ingestedCount": {
        "label": "Ingested Count",
        "description": "Number of documents ingested by this stage.",
        "valueType": "integer"
      },
      "duplicateCount": {
        "label": "Duplicate Count",
        "description": "Number of duplicate documents identified by this stage.",
        "valueType": "integer"
      },
      "exactDuplicateCount": {
        "label": "Exact Duplicate Count",
        "description": "Number of exact duplicate documents identified by this stage.",
        "valueType": "integer"
      },
      "skippedSameOriginCount": {
        "label": "Skipped Same-Origin Count",
        "description": "Number of same-origin documents skipped by this stage.",
        "valueType": "integer"
      },
      "splitCount": {
        "label": "Split Count",
        "description": "Number of documents or pages split by this stage.",
        "valueType": "integer"
      },
      "childCount": {
        "label": "Child Count",
        "description": "Number of child documents created by this stage.",
        "valueType": "integer"
      },
      "passedThroughCount": {
        "label": "Passed Through Count",
        "description": "Number of documents passed through without a transformation.",
        "valueType": "integer"
      },
      "passThroughs": {
        "label": "Pass-Throughs",
        "description": "Documents passed through without transformation and the reason.",
        "valueType": "array"
      },
      "rotatedCount": {
        "label": "Rotated Count",
        "description": "Number of documents or pages rotated by this stage.",
        "valueType": "integer"
      },
      "normalizedCount": {
        "label": "Normalized Count",
        "description": "Number of documents normalized by this stage.",
        "valueType": "integer"
      },
      "ocrCompletedCount": {
        "label": "OCR Completed Count",
        "description": "Number of documents with completed OCR processing.",
        "valueType": "integer"
      },
      "extractedCount": {
        "label": "Extracted Count",
        "description": "Number of documents with extracted metadata.",
        "valueType": "integer"
      },
      "needsReviewCount": {
        "label": "Needs Review Count",
        "description": "Number of documents requiring review after this stage.",
        "valueType": "integer"
      },
      "versionedCount": {
        "label": "Versioned Count",
        "description": "Number of documents versioned by this stage.",
        "valueType": "integer"
      },
      "resolvedCount": {
        "label": "Resolved Count",
        "description": "Number of documents resolved by this stage.",
        "valueType": "integer"
      },
      "skippedCount": {
        "label": "Skipped Count",
        "description": "Number of documents skipped by this stage.",
        "valueType": "integer"
      },
      "reviewNeededCount": {
        "label": "Review Needed Count",
        "description": "Number of documents marked for review by this stage.",
        "valueType": "integer"
      },
      "failedCount": {
        "label": "Failed Count",
        "description": "Number of documents that failed in this stage.",
        "valueType": "integer"
      },
      "currentPass": {
        "label": "Current Pass",
        "description": "The pass number currently represented by this stage entry.",
        "valueType": "integer"
      },
      "maxPasses": {
        "label": "Maximum Passes",
        "description": "Maximum number of passes configured for this stage.",
        "valueType": "integer"
      },
      "completedPasses": {
        "label": "Completed Passes",
        "description": "Pass numbers that completed successfully.",
        "valueType": "array"
      },
      "sourceFolderIds": {
        "label": "Source Folder IDs",
        "description": "Source folder identifiers processed by this stage.",
        "valueType": "array"
      },
      "collection": {
        "label": "Collection",
        "description": "Collection context used by the stage.",
        "valueType": "object"
      },
      "callback": {
        "label": "Callback",
        "description": "Callback delivery details for this stage.",
        "valueType": "object"
      },
      "error": {
        "label": "Error",
        "description": "Error reported by this stage.",
        "valueType": "string"
      },
      "openaiBatch": {
        "label": "OpenAI Batch",
        "description": "OpenAI batch request and wave details.",
        "valueType": "object"
      }
    }
  },
  "callback": {
    "properties": {
      "url": {
        "label": "Callback URL",
        "description": "Endpoint used for the stage callback.",
        "valueType": "string"
      },
      "deliveryStatus": {
        "label": "Delivery Status",
        "description": "Status of callback delivery.",
        "valueType": "string"
      },
      "notifiedAt": {
        "label": "Notified At",
        "description": "Unix timestamp in seconds when the callback was sent.",
        "valueType": "unixTimestamp"
      },
      "receivedAt": {
        "label": "Received At",
        "description": "Unix timestamp in seconds when the callback was received.",
        "valueType": "unixTimestamp"
      },
      "httpStatus": {
        "label": "HTTP Status",
        "description": "HTTP status returned for callback delivery.",
        "valueType": "integer"
      },
      "errorType": {
        "label": "Error Type",
        "description": "Category of callback delivery error.",
        "valueType": "string"
      },
      "errorMessage": {
        "label": "Error Message",
        "description": "Callback delivery error message.",
        "valueType": "string"
      }
    }
  },
  "collection": {
    "properties": {
      "name": {
        "label": "Collection Name",
        "description": "Name of the collection associated with the stage.",
        "valueType": "string"
      },
      "notes": {
        "label": "Collection Notes",
        "description": "Notes about the collection associated with the stage.",
        "valueType": "string"
      }
    }
  },
  "legacyImport": {
    "properties": {
      "status": {
        "label": "Status",
        "description": "Historical status of the legacy import.",
        "valueType": "string"
      },
      "binaryProcessingDatetime": {
        "label": "Binary Processing Date",
        "description": "Unix timestamp in seconds for historical binary processing.",
        "valueType": "unixTimestamp"
      },
      "costSavedUsd": {
        "label": "Cost Saved",
        "description": "Estimated United States dollar cost avoided by the historical processing.",
        "valueType": "currencyUsd"
      },
      "costUsd": {
        "label": "Cost",
        "description": "Recorded United States dollar cost of the historical processing.",
        "valueType": "currencyUsd"
      },
      "totalFiles": {
        "label": "Total Files",
        "description": "Total files represented by the historical batch.",
        "valueType": "integer"
      },
      "uniqueFiles": {
        "label": "Unique Files",
        "description": "Number of unique files in the historical batch.",
        "valueType": "integer"
      },
      "duplicateFiles": {
        "label": "Duplicate Files",
        "description": "Number of duplicate files in the historical batch.",
        "valueType": "integer"
      },
      "duplicateGroups": {
        "label": "Duplicate Groups",
        "description": "Number of duplicate groups in the historical batch.",
        "valueType": "integer"
      },
      "duplicatesRemovedTimestamp": {
        "label": "Duplicates Removed At",
        "description": "Unix timestamp in seconds when historical duplicates were removed.",
        "valueType": "unixTimestamp"
      },
      "interDuplicates": {
        "label": "Inter-Batch Duplicates",
        "description": "Duplicates found across historical batches.",
        "valueType": "integer"
      },
      "intraDuplicates": {
        "label": "Intra-Batch Duplicates",
        "description": "Duplicates found within the historical batch.",
        "valueType": "integer"
      },
      "processingTimeSeconds": {
        "label": "Processing Time",
        "description": "Recorded historical processing time in seconds.",
        "valueType": "durationSeconds"
      },
      "startedAt": {
        "label": "Started At",
        "description": "Unix timestamp in seconds when historical processing began.",
        "valueType": "unixTimestamp"
      },
      "completedAt": {
        "label": "Completed At",
        "description": "Unix timestamp in seconds when historical processing completed.",
        "valueType": "unixTimestamp"
      },
      "lastProcessed": {
        "label": "Last Processed At",
        "description": "Unix timestamp in seconds for the last historical processing update.",
        "valueType": "unixTimestamp"
      },
      "startedBy": {
        "label": "Started By",
        "description": "Actor recorded as starting the historical processing.",
        "valueType": "string"
      },
      "filesProcessedContent": {
        "label": "Files Processed for Content",
        "description": "Files processed for historical content analysis.",
        "valueType": "integer"
      },
      "filesAvoidedAi": {
        "label": "Files Avoided AI",
        "description": "Files that avoided historical AI processing.",
        "valueType": "integer"
      },
      "filesAvoidedOcr": {
        "label": "Files Avoided OCR",
        "description": "Files that avoided historical OCR processing.",
        "valueType": "integer"
      },
      "filesProcessed": {
        "label": "Files Processed",
        "description": "Files processed by the historical registry workflow.",
        "valueType": "integer"
      },
      "filesProcessedOcr": {
        "label": "Files Processed for OCR",
        "description": "Files processed by historical OCR workflow.",
        "valueType": "integer"
      },
      "filesProcessedStructural": {
        "label": "Files Processed Structurally",
        "description": "Files processed by historical structural workflow.",
        "valueType": "integer"
      },
      "ocrAccuracy": {
        "label": "OCR Accuracy",
        "description": "Historical OCR accuracy metric.",
        "valueType": "number"
      },
      "ocrCorrectedHigh": {
        "label": "OCR Corrected High",
        "description": "Historical OCR items corrected at the high threshold.",
        "valueType": "integer"
      },
      "ocrCorrectedMedium": {
        "label": "OCR Corrected Medium",
        "description": "Historical OCR items corrected at the medium threshold.",
        "valueType": "integer"
      },
      "ocrCorrectedLow": {
        "label": "OCR Corrected Low",
        "description": "Historical OCR items corrected at the low threshold.",
        "valueType": "integer"
      },
      "ocrQualityScoreCorrected": {
        "label": "Corrected OCR Quality Score",
        "description": "Historical OCR quality score after correction.",
        "valueType": "number"
      },
      "ocrQualityScoreOriginal": {
        "label": "Original OCR Quality Score",
        "description": "Historical OCR quality score before correction.",
        "valueType": "number"
      },
      "problematicFilesPercentage": {
        "label": "Problematic Files Percentage",
        "description": "Percentage of historical files identified as problematic.",
        "valueType": "number"
      },
      "qualityThresholdHigh": {
        "label": "High Quality Threshold",
        "description": "Historical OCR threshold for high quality.",
        "valueType": "number"
      },
      "qualityThresholdMedium": {
        "label": "Medium Quality Threshold",
        "description": "Historical OCR threshold for medium quality.",
        "valueType": "number"
      },
      "qualityThresholdLow": {
        "label": "Low Quality Threshold",
        "description": "Historical OCR threshold for low quality.",
        "valueType": "number"
      },
      "duplicateRecoveryStatsTimestamp": {
        "label": "Duplicate Recovery Stats At",
        "description": "Unix timestamp in seconds for historical duplicate recovery statistics.",
        "valueType": "unixTimestamp"
      },
      "totalAiSavingsUsd": {
        "label": "Total AI Savings",
        "description": "Estimated United States dollar savings from avoided historical AI processing.",
        "valueType": "currencyUsd"
      },
      "totalOcrSavingsUsd": {
        "label": "Total OCR Savings",
        "description": "Estimated United States dollar savings from avoided historical OCR processing.",
        "valueType": "currencyUsd"
      },
      "notebook1Registry": {
        "label": "Notebook 1: Master Registry",
        "description": "Historical notebook that registered the batch and established its source-file inventory.",
        "valueType": "object"
      },
      "notebook2Binary": {
        "label": "Notebook 2: Binary Processing",
        "description": "Historical notebook that processed binary files and resolved binary duplicates.",
        "valueType": "object"
      },
      "notebook3Ocr": {
        "label": "Notebook 3: OCR Processing",
        "description": "Historical notebook that performed OCR processing and recorded OCR quality statistics.",
        "valueType": "object"
      },
      "notebook4Content": {
        "label": "Notebook 4: Content Processing",
        "description": "Historical notebook that performed content analysis and content deduplication.",
        "valueType": "object"
      },
      "notebook5Structural": {
        "label": "Notebook 5: Structural Processing",
        "description": "Historical notebook that performed structural analysis and similarity resolution.",
        "valueType": "object"
      },
      "notebook6Metadata": {
        "label": "Notebook 6: Metadata Processing",
        "description": "Historical notebook that extracted and persisted document metadata.",
        "valueType": "object"
      },
      "notebook7Semantic": {
        "label": "Notebook 7: Semantic Processing",
        "description": "Historical notebook that performed semantic analysis and rights determination.",
        "valueType": "object"
      },
      "notebook8Collections": {
        "label": "Notebook 8: Collection Processing",
        "description": "Historical notebook that assigned collections and completed historical metadata validation.",
        "valueType": "object"
      },
      "discrepancySummary": {
        "label": "Discrepancy Summary",
        "description": "Summary recorded for the historical discrepancy log.",
        "valueType": "string"
      },
      "discrepancyCorrectionTimestamp": {
        "label": "Discrepancy Correction At",
        "description": "Unix timestamp in seconds when the historical discrepancy was corrected.",
        "valueType": "unixTimestamp"
      },
      "discrepancyExplanation": {
        "label": "Discrepancy Explanation",
        "description": "Explanation recorded for the historical discrepancy.",
        "valueType": "string"
      },
      "discrepancyMissingUniqueEntries": {
        "label": "Missing Unique Entries",
        "description": "Number of unique entries missing from the historical discrepancy.",
        "valueType": "integer"
      },
      "discrepancySource": {
        "label": "Discrepancy Source",
        "description": "Source recorded for the historical discrepancy.",
        "valueType": "string"
      },
      "discrepancyStatus": {
        "label": "Discrepancy Status",
        "description": "Status recorded for the historical discrepancy.",
        "valueType": "string"
      },
      "discrepancyTotalBinaryRegistered": {
        "label": "Total Binary Registered",
        "description": "Total number of binary files recorded in the historical discrepancy.",
        "valueType": "integer"
      },
      "discrepancyTotalContentHashes": {
        "label": "Total Content Hashes",
        "description": "Total number of content hashes recorded in the historical discrepancy.",
        "valueType": "integer"
      },
      "fileAnalysisQualityAssessmentNote": {
        "label": "File Analysis Quality Note",
        "description": "Note recorded for the historical file-quality assessment.",
        "valueType": "string"
      },
      "fileAnalysisQualityAssessmentSource": {
        "label": "File Analysis Quality Source",
        "description": "Source recorded for the historical file-quality assessment.",
        "valueType": "string"
      },
      "fileAnalysisQualityAssessmentRecommendation": {
        "label": "File Analysis Quality Recommendation",
        "description": "Recommendation recorded for the historical file-quality assessment.",
        "valueType": "string"
      },
      "fileAnalysisQualityAssessmentDistributionHigh": {
        "label": "High-Quality File Distribution",
        "description": "Number of historical files in the high-quality distribution.",
        "valueType": "integer"
      },
      "fileAnalysisQualityAssessmentDistributionMedium": {
        "label": "Medium-Quality File Distribution",
        "description": "Number of historical files in the medium-quality distribution.",
        "valueType": "integer"
      },
      "fileAnalysisQualityAssessmentDistributionLow": {
        "label": "Low-Quality File Distribution",
        "description": "Number of historical files in the low-quality distribution.",
        "valueType": "integer"
      },
      "fileAnalysisDuplicateIdentificationMethod": {
        "label": "Duplicate Identification Method",
        "description": "Method recorded for historical duplicate identification.",
        "valueType": "string"
      },
      "fileAnalysisDuplicateIdentificationExactDuplicatesFound": {
        "label": "Exact Duplicates Found",
        "description": "Number of exact duplicates found by historical file analysis.",
        "valueType": "integer"
      }
    },
    "patterns": {}
  },
  "notebook": {
    "properties": {
      "batchProcessed": {
        "label": "Batch Processed",
        "description": "Whether the historical notebook processed the batch.",
        "valueType": "boolean"
      },
      "errorCount": {
        "label": "Error Count",
        "description": "Number of errors recorded by the historical notebook.",
        "valueType": "integer"
      },
      "filesProcessed": {
        "label": "Files Processed",
        "description": "Number of files processed by the historical notebook.",
        "valueType": "integer"
      },
      "lastProcessed": {
        "label": "Last Processed At",
        "description": "Unix timestamp in seconds for the notebook's last processing update.",
        "valueType": "unixTimestamp"
      },
      "registryVersion": {
        "label": "Registry Version",
        "description": "Registry version used by the historical notebook.",
        "valueType": "string"
      },
      "status": {
        "label": "Status",
        "description": "Status recorded by the historical notebook.",
        "valueType": "string"
      },
      "avgScore": {
        "label": "Average Score",
        "description": "Average historical OCR quality score.",
        "valueType": "number"
      },
      "highCount": {
        "label": "High Count",
        "description": "Historical OCR items at the high quality level.",
        "valueType": "integer"
      },
      "mediumCount": {
        "label": "Medium Count",
        "description": "Historical OCR items at the medium quality level.",
        "valueType": "integer"
      },
      "lowCount": {
        "label": "Low Count",
        "description": "Historical OCR items at the low quality level.",
        "valueType": "integer"
      },
      "problematicCount": {
        "label": "Problematic Count",
        "description": "Historical OCR items identified as problematic.",
        "valueType": "integer"
      },
      "totalFiles": {
        "label": "Total Files",
        "description": "Total files evaluated by the historical notebook.",
        "valueType": "integer"
      }
    }
  }
} as const
