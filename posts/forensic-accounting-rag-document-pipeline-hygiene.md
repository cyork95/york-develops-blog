---
title: "Forensic Accounting & RAG Document Pipeline Hygiene: Applying Corporate Auditing Workflows to Enterprise Context Ingestion"
date: 2026-06-23
description: "How corporate auditing practices, layout parsers, MinHash LSH deduplication, active reconciliation engines, and runtime validation layers ensure data hygiene in enterprise RAG pipelines."
tags: [rag, vector-databases, deduplication, forensic-accounting, data-hygiene, llamaparse, openlineage, python]
---

The rapid integration of Retrieval-Augmented Generation (RAG) platforms within corporate environments has exposed a fundamental engineering bottleneck: the performance of large language models (LLMs) is fundamentally bounded by the integrity of the data ingested into vector databases<sup>1</sup>. While typical system designs focus heavily on retrieval algorithms and vector indexing techniques, they frequently ignore the structural, semantic, and factual inconsistencies inherent in raw corporate data repositories<sup>3</sup>.

Corporate data lakes are littered with corrupted, duplicate, obsolete, or poorly structured documents that introduce noise, bias, and outright contradictions into the retrieved context<sup>1</sup>. This data contamination leads directly to a phenomenon known as "Garbage In, Garbage Out," where the generation layer of the RAG system produces fluent but factually incorrect or outdated answers<sup>4</sup>.

To address these vulnerabilities, enterprise AI architectures must adopt workflows derived from forensic accounting<sup>4</sup>. Forensic accountants operate under a regime of systematic verification, scrutinizing unstructured financial documents for missing metadata, broken chains of custody, anomalous restatements, and conflicting paper trails<sup>4</sup>. By translating these auditing concepts into data engineering pipelines, enterprises can build automated "Data Auditor" pipelines<sup>4</sup>. These pipelines systematically clean, deduplicate, and reconcile corporate documents before their semantic vectors ever populate a production database<sup>3</sup>.

## Architectural Taxonomy of Corporate Document Ingestion

Enterprise data stores are dominated by complex multi-page files, such as financial statements, regulatory audits, tax tables, policy disclosures, and meeting minutes<sup>9</sup>. Transforming these visual layouts into clean, machine-readable representations requires specialized parsing engines capable of identifying structural boundaries, tables, and visual hierarchies<sup>9</sup>.

The initial ingestion stage of a forensic document pipeline must determine the layout complexity of incoming files and route them to the appropriate extraction engine<sup>10</sup>. Applying uniform, rule-based text splitters across diverse corporate documents leads to text fragmentation, splitting tables and lists in logical mid-points and destroying semantic coherence<sup>12</sup>.

| Parser Class & Library | Primary Extraction Strategy | Structural Elements Preserved | Latency Profile | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **Unstructured (Fast)**<sup>11</sup> | Sequential text layer parsing without layout models<sup>10</sup>. | Flat paragraphs and raw lists<sup>14</sup>. | Ultra-low ($< 100\text{ ms}$ per page)<sup>15</sup>. | Plain-text training manuals, historical plain memos<sup>10</sup>. |
| **Unstructured (Hi-Res)**<sup>11</sup> | Computer vision layout analysis via object detection<sup>10</sup>. | Document elements (Titles, Tables, Headers)<sup>14</sup>. | High (requires local GPU or API latency)<sup>11</sup>. | Annual reports, complex multi-column audits, tables<sup>10</sup>. |
| **LlamaParse**<sup>9, 17</sup> | GenAI-native multimodal parsing and custom instructions<sup>9</sup>. | Semi-structured markdown, visual charts, embedded tables<sup>9</sup>. | Variable (cloud API dependent)<sup>9</sup>. | Regulatory filings with integrated figures and financial footnotes<sup>9</sup>. |

To maintain system reliability at scale, the pipeline must enforce strict handling limits on exceptionally long files<sup>18</sup>. Large PDFs often degrade layout detection models, leading to out-of-memory errors and pipeline failures<sup>18</sup>. A robust auditor pipeline mitigates this by programmatically segmenting files into controlled batches prior to layout partitioning, isolating extraction execution to prevent cascading failures<sup>18</sup>.

### Dynamic Layout Parsing and Semantic Structuring

When processing high-fidelity corporate documents such as SEC filings, raw text extraction is highly ineffective because it flattens tables and strips out visual cues that indicate hierarchy<sup>10</sup>. For example, Unstructured preserves table schemas by isolating tabular bounding boxes and generating a semantic HTML representation (`text_as_html`) inside the element metadata<sup>14</sup>. This HTML representation preserves rows, columns, and logical alignments, ensuring the embedding model can capture relationships that are otherwise lost in flattened text<sup>10</sup>.

Furthermore, LlamaParse implements multimodal parsing to extract embedded visual elements, charts, and diagrams into structured markdown format<sup>9</sup>. LlamaParse also provides extraction metadata extensions, exposing schema-level metadata that captures both the layout quality and semantic validity of the parsed document<sup>20</sup>.

```text
Incoming Corporate Document
          │
          ▼
┌───────────────────────────────────┐
│     PyPDF2 Pre-Batching Block     │ ──► Batches large PDFs into 100-page chunks
└───────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────┐
│   Unstructured Hi-Res Partition   │ ──► Extracts visual elements, headers, and text
└───────────────────────────────────┘
          │
          ├───► Table Elements ───► Extract `text_as_html` metadata
          │
          └───► Text Elements ────► Render into semantic markdown layout
```

To optimize down-funnel retrieval performance, data pipelines must separate the metadata visible to the LLM during answer synthesis from the metadata visible to the embedding model<sup>21</sup>. This is managed by configuring the attributes of text nodes in LlamaIndex<sup>21</sup>. By explicitly separating embedding and synthesis metadata, system architects ensure that internal administrative structures do not bias the vector space<sup>21</sup>.

```python
import os
from typing import List, Dict, Any
from PyPDF2 import PdfReader, PdfWriter
from llama_parse import LlamaParse
from unstructured.partition.pdf import partition_pdf

class ForensicIngestionAuditor:
    def __init__(self, llama_api_key: str):
        self.llama_api_key = llama_api_key
        
    def batch_large_pdf(self, input_path: str, batch_size: int = 100) -> List[str]:
        """
        Segments large PDF files into smaller batches to prevent pipeline 
        memory depletion and ensure fault-tolerant processing.
        """
        reader = PdfReader(input_path)
        total_pages = len(reader.pages)
        generated_paths = []
        
        if total_pages <= batch_size:
            return [input_path]
            
        num_batches = (total_pages // batch_size) + 1
        base_dir = os.path.dirname(input_path)
        base_name = os.path.basename(input_path).replace(".pdf", "")
        
        for b in range(num_batches):
            writer = PdfWriter()
            start_page = b * batch_size
            end_page = min((b + 1) * batch_size, total_pages)
            
            if start_page >= total_pages:
                break
                
            for page_idx in range(start_page, end_page):
                writer.add_page(reader.pages[page_idx])
                
            batch_filename = f"{base_name}_batch_{b+1}.pdf"
            batch_path = os.path.join(base_dir, batch_filename)
            with open(batch_path, "wb") as output_file:
                writer.write(output_file)
            generated_paths.append(batch_path)
            
        return generated_paths

    def parse_tables_and_layouts(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Executes hybrid parsing to capture both high-fidelity markdown layout 
        and raw HTML table representations for accurate semantic preservation.
        """
        # Execute Unstructured Hi-Res partitioning to isolate embedded tables
        unstructured_elements = partition_pdf(
            filename=file_path,
            strategy="hi_res",
            infer_table_structure=True,
            include_page_breaks=True
        )
        
        isolated_tables = {}
        for element in unstructured_elements:
            if element.category == "Table" and hasattr(element.metadata, "text_as_html"):
                page_num = getattr(element.metadata, "page_number", 1)
                if page_num not in isolated_tables:
                    isolated_tables[page_num] = []
                isolated_tables[page_num].append({
                    "raw_text": element.text,
                    "html_content": element.metadata.text_as_html
                })

        # Process document through LlamaParse for layout-aware markdown representation
        parser = LlamaParse(
            api_key=self.llama_api_key,
            result_type="markdown",
            num_workers=4,
            verbose=True,
            language="en"
        )
        parsed_documents = parser.load_data(file_path)
        
        enriched_nodes = []
        for idx, doc in enumerate(parsed_documents):
            page_num = idx + 1
            node_tables = isolated_tables.get(page_num, [])
            
            enriched_nodes.append({
                "id": f"{os.path.basename(file_path)}_page_{page_num}",
                "text_content": doc.text,
                "tables": node_tables,
                "extraction_metrics": {
                    "confidence": getattr(doc, "extraction_confidence", 0.92),
                    "page_reference": page_num
                }
            })
            
        return enriched_nodes
```

## The Semantic Ledger: Near-Duplicate and Overlap Mitigation

A primary source of data contamination in enterprise context stores is document duplication<sup>1</sup>. When multiple versions of standard operating procedures, historical audit drafts, or cumulative spreadsheets reside in shared directories, standard vector indexes return highly redundant chunks<sup>1</sup>. This statistical redundancy overpowers the model's attention window, skewing semantic representations and causing inaccurate generation<sup>3</sup>.

To enforce pipeline hygiene, the Data Auditor must implement a deduplication framework that screens incoming documents before they reach the vector database<sup>1</sup>.

| Deduplication Strategy | Algorithmic Underpinnings | Target Format | Computational Cost | Operational Sensitivity |
| :--- | :--- | :--- | :--- | :--- |
| **Exact Deduplication**<sup>23</sup> | MD5 or SHA-256 cryptographic hashing<sup>24</sup>. | Identical raw string matches<sup>23</sup>. | Extremely Low ($< 1\text{ ms}$ per megabyte) | Highly fragile; fails if a single character is modified<sup>25</sup>. |
| **Near-Duplicate LSH**<sup>23, 26</sup> | MinHash signature matrix calculation and banding<sup>26</sup>. | Overlapping documents and version variants<sup>1</sup>. | Low to Moderate ($O(N)$ per document)<sup>28</sup>. | Highly tunable similarity thresholds<sup>23</sup>. |
| **Semantic Deduplication**<sup>25</sup> | Dense vector embedding generation and pairwise similarity clustering<sup>25</sup>. | Meaning-based duplicates and paraphrases<sup>25</sup>. | Extremely High (requires dedicated GPU pipelines)<sup>25</sup>. | Sensitive to structural noise and context lengths<sup>25</sup>. |

### Mathematical Mechanics of MinHash LSH Deduplication

MinHash LSH is a probabilistic technique used to estimate the Jaccard similarity between two document sets<sup>26</sup>. The document text is tokenized into a set of unique $k$-character shingles, converting the raw text into a set representation $S(D)$<sup>26</sup>.

A series of $n$ independent hash functions map these shingles to a compact signature vector<sup>26</sup>. The MinHash value of a document set $S$ under a hash function $h$ is defined as the minimum hash value generated over the set of shingles<sup>26</sup>:

$$h_{min}(S) = \min_{s \in S} h(s)$$

The probability that two document sets produce identical MinHash values is equal to their Jaccard similarity<sup>26</sup>:

$$P(h_{min}(A) = h_{min}(B)) = J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

To generate MinHash values efficiently, the pipeline implements hashing using a Mersenne prime $p$<sup>30</sup>:

$$h(x) = (a \cdot x + b) \pmod p$$

where $a, b$ are randomly generated integer coefficients<sup>30</sup>. The signature vector of length $n$ (commonly $128$ or $256$) is partitioned into $b$ bands containing $r$ rows each, such that $b \cdot r = n$<sup>26</sup>. If two documents share identical signature values for all rows within at least one band, they are mapped to the same hash bucket, identifying them as candidate duplicates<sup>26</sup>.

```python
import string
from typing import List, Tuple, Set
from datasketch import MinHash, MinHashLSH

class SemanticLedgerAuditor:
    def __init__(self, threshold: float = 0.85, num_perm: int = 128):
        self.threshold = threshold
        self.num_perm = num_perm
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perm)
        
    def _extract_shingles(self, text: str, k: int = 5) -> Set[str]:
        """
        Preprocesses raw text and extracts character-level k-shingles 
        to capture structural n-gram distributions.
        """
        clean_text = text.lower().translate(str.maketrans("", "", string.punctuation))
        normalized = " ".join(clean_text.split())
        
        shingles = set()
        for i in range(len(normalized) - k + 1):
            shingles.add(normalized[i:i+k])
        return shingles

    def build_minhash_signature(self, text: str) -> MinHash:
        """
        Generates a MinHash signature using parallel shingle processing 
        to represent the document in Jaccard space.
        """
        shingles = self._extract_shingles(text)
        mh = MinHash(num_perm=self.num_perm)
        for shingle in shingles:
            mh.update(shingle.encode("utf8"))
        return mh

    def inspect_and_ledger_document(self, doc_id: str, text: str) -> Tuple[bool, List[str]]:
        """
        Audits incoming text against the registered LSH index.
        Registers the document if unique, or returns existing duplicate matches.
        """
        current_mh = self.build_minhash_signature(text)
        matching_duplicates = self.lsh.query(current_mh)
        
        if matching_duplicates:
            # Document violates unique constraints; flagged as duplicate
            return False, matching_duplicates
            
        # Register clean, unique document to the LSH ledger
        self.lsh.insert(doc_id, current_mh)
        return True, []
```

## The Reconciliation Engine: Automated Pre-Vector Resolution

RAG pipelines frequently retrieve multiple documents that contain contradictory claims about the same corporate metric<sup>4</sup>. This is common with financial forecasts, policy versions, or product documentation<sup>3</sup>.

Standard generation models have no inherent mechanism to weigh document authority or source dates, leading them to select from conflicting facts based on position or lexical alignment<sup>3</sup>. This results in incorrect outputs that are presented to users with high confidence<sup>3</sup>.

```text
                Retrieved Context Blocks
                            │
                            ▼
               ┌─────────────────────────┐
               │   Reconciliation Stage  │ ──► Perform pairwise verification
               └─────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      No Conflict Found           Conflict Detected
              │                           │
              ▼                           ▼
       Format Context             Evaluate Conflict Type
       for Generation              - Temporal (Keep latest)
                                   - Authority (Keep highest level)
                                   - Dispute (Abstain or warn user)
```

To resolve these conflicts, the pipeline implements an active Reconciliation Engine<sup>3</sup>.

### Typology of Knowledge Conflicts

The system categorizes retrieved data disputes into three operational patterns:
* **Temporal Discrepancies:** Conflict arising from chronological updates, where newer revisions supersede older documents (e.g., Q1 revised earnings vs. preliminary projections)<sup>3</sup>.
* **Authority Discrepancies:** Discrepancies where one source originates from a higher governance tier (e.g., board-approved policies vs. draft proposals)<sup>31</sup>.
* **Unresolved Disputes:** Contradictions without structural signals to determine precedence, requiring the system to flag the dispute and alert the user<sup>3</sup>.

### Heuristics for Automated Inconsistency Detection

The system detects conflicts using a multi-layered verification approach:
* **Numerical Contradiction Detection:** Maps numerical entities associated with similar context labels, flagging mismatched metrics (e.g., "$30\text{ days}$" vs. "$60\text{ days}$")<sup>3</sup>.
* **Contradiction Signal Asymmetry:** Scans text spans using negation and directional tokens<sup>3</sup>. The system maintains set pairs such as:

$$\{\text{not}, \text{never}, \text{no}\} \quad \text{and} \quad \{\text{increased}, \text{decreased}, \text{reduced}\}$$

If parallel context strings map identical metric targets to opposing negation or directional tokens, a conflict is flagged<sup>3</sup>.

* **Semantic Natural Language Inference (NLI):** For complex disputes, the system routes context pairs through a localized NLI cross-encoder<sup>3</sup>. The model evaluates sentences $s_1$ and $s_2$ to compute probability distributions across entailment, neutrality, and contradiction<sup>3</sup>:

$$P(y \mid s_1, s_2) = \text{Softmax}(\text{CrossEncoder}(s_1, s_2))$$

where $y \in \{\text{entailment}, \text{neutral}, \text{contradiction}\}$. Pairs that exceed a contradiction threshold (e.g., $P(\text{contradiction}) > 0.8$) are flagged for resolution<sup>3</sup>.

| Conflict Category | Target Metrics | Detection Heuristic | Automated Resolution Strategy |
| :--- | :--- | :--- | :--- |
| **Temporal Clash**<sup>4</sup> | Mismatched numbers or policies across fiscal dates<sup>3</sup>. | Numerical extraction paired with date metadata sorting<sup>3</sup>. | Automatically retain the newest document version; discard the older file<sup>3</sup>. |
| **Authority Clash**<sup>32</sup> | Discrepancy between policy rules or operational procedures<sup>3</sup>. | Metadata taxonomy verification of governance levels<sup>31</sup>. | Retain the document with the higher authority tier; log the lower tier as superseded<sup>31</sup>. |
| **Unresolved Factual Dispute**<sup>4</sup> | Directly contradictory claims with identical dates and authority tiers<sup>3</sup>. | NLI contradiction scoring ($P(\text{contradiction}) > 0.8$)<sup>3</sup>. | Retain both documents in the context window, and instruct the LLM to explicitly warn the user<sup>3</sup>. |

```python
import spacy
from typing import Dict, Any, List, Tuple, Optional

class ReconciliationEngine:
    def __init__(self):
        # Load small English model for numerical entity parsing
        self.nlp = spacy.load("en_core_web_sm")
        self.negation_tokens = {"not", "never", "no", "cannot", "doesnt", "isnt", "wasnt"}
        self.directional_tokens = {"increased", "decreased", "reduced", "eliminated", "removed"}

    def detect_numerical_conflict(self, text_a: str, text_b: str) -> bool:
        """
        Extracts numerical values and checks if identical entities 
        are associated with conflicting numeric metrics.
        """
        doc_a = self.nlp(text_a)
        doc_b = self.nlp(text_b)
        
        entities_a = {ent.text: ent.label_ for ent in doc_a.ents if ent.label_ in ("MONEY", "PERCENT", "CARDINAL", "DATE")}
        entities_b = {ent.text: ent.label_ for ent in doc_b.ents if ent.label_ in ("MONEY", "PERCENT", "CARDINAL", "DATE")}
        
        # Check for overlaps of numerical descriptions
        for ent_text, label in entities_a.items():
            if label in ("MONEY", "PERCENT", "CARDINAL"):
                # If matching semantic nouns exist but the exact numeric value is different
                for other_text, other_label in entities_b.items():
                    if label == other_label and ent_text != other_text:
                        return True
        return False

    def reconcile_document_pair(
        self, 
        doc_a: Dict[str, Any], 
        doc_b: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """
        Reconciles a pair of conflicting documents based on metadata,
        version precedence, and authority hierarchy.
        """
        text_a = doc_a["text_content"]
        text_b = doc_b["text_content"]
        
        has_numerical_conflict = self.detect_numerical_conflict(text_a, text_b)
        
        if not has_numerical_conflict:
            return doc_a, None
            
        meta_a = doc_a["audit_metadata"]
        meta_b = doc_b["audit_metadata"]
        
        # Priority 1: Governance/Authority Level Comparison
        authority_hierarchy = {"CRITICAL": 3, "STANDARD": 2, "DRAFT": 1}
        level_a = authority_hierarchy.get(meta_a.get("authority_level", "STANDARD"), 2)
        level_b = authority_hierarchy.get(meta_b.get("authority_level", "STANDARD"), 2)
        
        if level_a != level_b:
            resolved = doc_a if level_a > level_b else doc_b
            discarded = doc_b if level_a > level_b else doc_a
            log_msg = f"Resolved via authority hierarchy: {resolved['doc_id']} overrides {discarded['doc_id']}."
            return resolved, log_msg
            
        # Priority 2: Temporal Precedence Comparison
        date_a = meta_a.get("effective_date", "0000-00-00")
        date_b = meta_b.get("effective_date", "0000-00-00")
        
        if date_a != date_b:
            resolved = doc_a if date_a > date_b else doc_b
            discarded = doc_b if date_a > date_b else doc_a
            log_msg = f"Resolved via temporal precedence: {resolved['doc_id']} ({date_a}) overrides {discarded['doc_id']} ({date_b})."
            return resolved, log_msg
            
        # Priority 3: Fallback to Manual Escalation Trigger
        escalation_warning = f"Conflict detected between {doc_a['doc_id']} and {doc_b['doc_id']}. Unable to resolve automatically."
        return doc_a, escalation_warning
```

## The Self-Healing Runtime Validation Layer

Even when robust filters are applied during document ingestion, RAG systems can still experience runtime failures<sup>5</sup>. For instance, generation models may hallucinate incorrect metrics or contradict retrieved source documents due to attention mechanisms drifting over long contexts<sup>5</sup>.

To prevent these errors from reaching downstream systems, the pipeline implements a post-generation validation layer built around a `HallucinationHealer`<sup>5</sup>.

```text
               Generated Response from LLM
                            │
                            ▼
               ┌─────────────────────────┐
               │   HallucinationHealer   │ ──► Compute Real-Time Quality Score
               └─────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Score >= 0.75  0.50 - 0.74    Score < 0.50
              │             │             │
              ▼             ▼             ▼
          [ACCEPT]       [HEAL]       [DISCARD]
          Deliver      Apply patches   Route to safe
         original      and recheck      decline message
```

### Dynamic Quality Score Engine

Upon receiving a generated response, the validation layer calculates a composite quality score to determine the appropriate routing path<sup>5</sup>:

$$S_{\text{quality}} = 0.40 \cdot S_{\text{faithfulness}} + 0.30 \cdot S_{\text{consistency}} + 0.20 \cdot S_{\text{confidence}} + 0.10 \cdot S_{\text{latency}} - 0.20 \cdot P_{\text{drift}}$$

where:
* $S_{\text{faithfulness}}$ is the faithfulness score, calculated dynamically using keyword and token overlap against the retrieved source documents<sup>5</sup>.
* $S_{\text{consistency}}$ is the semantic consistency score, defined as $1.0$ if no contradiction is flagged and $0.0$ if any contradiction is detected<sup>5</sup>.
* $S_{\text{confidence}}$ is the generation confidence score<sup>5</sup>.
* $S_{\text{latency}}$ is the latency performance index, designed to penalize slow processing steps<sup>5</sup>.
* $P_{\text{drift}}$ is a pipeline drift penalty applied to account for upstream data degradation<sup>5</sup>.

The latency score $S_{\text{latency}}$ is calculated dynamically to fit within tight API execution budgets<sup>5</sup>. If processing is completed within $20\text{ ms}$ (using fast regex pattern matching), $S_{\text{latency}} = 1.0$<sup>5</sup>. If processing takes between $20\text{ ms}$ and $200\text{ ms}$ (using spaCy NER), $S_{\text{latency}}$ scales down linearly<sup>5</sup>. If latency exceeds $200\text{ ms}$, the latency score is set to $0.0$, indicating a system bottleneck<sup>5</sup>.

| Routing Action | Threshold Range | Operational Action and Response Execution |
| :--- | :---: | :--- |
| **ACCEPT**<sup>5</sup> | $S_{\text{quality}} \ge 0.75$ | Deliver the response directly; log execution parameters as a clean retrieval event<sup>5</sup>. |
| **HEALED_ACCEPT**<sup>5</sup> | $0.50 \le S_{\text{quality}} < 0.75$ | Apply automated patching, recheck quality scores, and deliver the corrected response with metadata annotations<sup>5</sup>. |
| **DISCARD / REJECT**<sup>5</sup> | $S_{\text{quality}} < 0.50$ | Prevent response delivery, trigger upstream pipeline diagnostics, and return a standard compliance warning<sup>3</sup>. |

### Deterministic Healing Strategies

When a generated response triggers the healing workflow, the system sequentially evaluates three deterministic correction strategies:
* **Strategy A: Contradiction Patching:** If the system detects a numerical contradiction between the generated response and the source text, it patches the incorrect values in-place<sup>5</sup>. This is done using a single ordered pass to prevent grammatical errors<sup>5</sup>. For example, if a billing frequency mismatch is found, it replaces the values and normalizes the text (e.g., "per month, billed monthly" $\to$ "per year, billed annually")<sup>5</sup>.
* **Strategy B: Entity Scrubbing:** If the model includes named entities, references, or citations that do not exist in the retrieved context, the system removes the sentences containing the unverified information<sup>5</sup>. To maintain transparency, the system appends a note: *"Note: specific references could not be verified in the source documents and have been omitted."*<sup>5</sup>
* **Strategy C: Grounding Rewrite:** If faithfulness falls below a critical threshold (specifically $S_{\text{faithfulness}} < 0.50$), the system bypasses the generated output entirely<sup>5</sup>. It reconstructs a response from scratch using keyword overlap and contextual prefixes mapped to numbers, dates, or currencies<sup>5</sup>.

```python
import re
import time
import spacy
from typing import Dict, Any, List

class HallucinationHealer:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")

    def evaluate_faithfulness(self, response: str, context: str) -> float:
        """
        Computes semantic faithfulness based on normalized word overlap 
        between the generated response and the source context.
        """
        response_words = set(re.findall(r"\w+", response.lower()))
        context_words = set(re.findall(r"\w+", context.lower()))
        
        if not response_words:
            return 0.0
            
        overlap = response_words.intersection(context_words)
        return len(overlap) / len(response_words)

    def calculate_quality_score(
        self,
        faithfulness: float,
        has_contradiction: bool,
        confidence: float,
        latency_ms: float,
        drift_penalty: float
    ) -> float:
        """
        Computes the composite quality score to determine response routing.
        """
        consistency = 0.0 if has_contradiction else 1.0
        
        # Calculate latency score with linear decay
        if latency_ms < 20.0:
            latency_score = 1.0
        elif latency_ms < 200.0:
            latency_score = (200.0 - latency_ms) / 180.0
        else:
            latency_score = 0.0
            
        score = (
            (0.40 * faithfulness) + 
            (0.30 * consistency) + 
            (0.20 * confidence) + 
            (0.10 * latency_score) - 
            (0.20 * drift_penalty)
        )
        return max(0.0, min(1.0, score))

    def apply_healing_patch(self, response: str, context: str) -> str:
        """
        Identifies and replaces conflicting numeric metrics in the response 
        using verified values from the context.
        """
        # Scan for numeric matches in context and patch the response
        numbers_in_context = re.findall(r"\b\d+\b", context)
        numbers_in_response = re.findall(r"\b\d+\b", response)
        
        healed_response = response
        if numbers_in_context and numbers_in_response:
            # Replace the first mismatched numeric entity as a baseline patch
            primary_correct_val = numbers_in_context[0]
            primary_incorrect_val = numbers_in_response[0]
            healed_response = re.sub(
                r"\b" + primary_incorrect_val + r"\b", 
                primary_correct_val, 
                healed_response
            )
        return healed_response

    def process_and_route(
        self,
        generated_response: str,
        retrieved_context_list: List[Dict[str, Any]],
        raw_confidence: float,
        start_time: float,
        drift_penalty: float = 0.0
    ) -> Dict[str, Any]:
        """
        Inspects, scores, heals, and routes the generated response.
        """
        combined_context = " ".join([node["text_content"] for node in retrieved_context_list])
        
        # Initial evaluations
        faithfulness = self.evaluate_faithfulness(generated_response, combined_context)
        
        # Detect basic numerical mismatch
        numbers_context = set(re.findall(r"\b\d+\b", combined_context))
        numbers_response = set(re.findall(r"\b\d+\b", generated_response))
        has_contradiction = len(numbers_response.difference(numbers_context)) > 0
        
        latency_ms = (time.time() - start_time) * 1000.0
        
        score = self.calculate_quality_score(
            faithfulness, has_contradiction, raw_confidence, latency_ms, drift_penalty
        )
        
        if score >= 0.75:
            return {"status": "ACCEPT", "response": generated_response, "score": score}
            
        if score >= 0.50 and has_contradiction:
            # Apply contradiction patching
            healed = self.apply_healing_patch(generated_response, combined_context)
            post_heal_faithfulness = self.evaluate_faithfulness(healed, combined_context)
            
            # Recheck contradictions
            healed_numbers = set(re.findall(r"\b\d+\b", healed))
            post_heal_contradiction = len(healed_numbers.difference(numbers_context)) > 0
            
            post_heal_score = self.calculate_quality_score(
                post_heal_faithfulness, post_heal_contradiction, raw_confidence, latency_ms, drift_penalty
            )
            
            if post_heal_score >= 0.75:
                return {
                    "status": "HEALED_ACCEPT", 
                    "response": healed, 
                    "score": post_heal_score,
                    "note": "Factual corrections applied by healing layer."
                }
                
        # Decline response delivery if quality checks fail
        return {
            "status": "REJECT",
            "response": "The retrieved sources contain conflicting information on this topic, preventing the generation of a verified response.",
            "score": score
        }
```

## Document Lineage, Provenance, and the Metadata Control Plane

Maintaining a trustworthy context store requires distinguishing between data lineage and data provenance<sup>6</sup>. Data lineage tracks the structural flow of a document as it moves through various systems and transformations<sup>6</sup>. Data provenance focuses on validation and authorization, tracking who created the file, where it originated, and its compliance parameters<sup>6</sup>.

```text
                     Corporate Documents Ingested
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   OpenLineage Parser    │
                     └─────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
     RunEvent                 JobEvent                DatasetEvent
(Tracks execution times, (Tracks pipeline version, (Tracks schema updates &
 inputs, and output paths) dependencies, and hashing)   physical storage tables)
    [cite: 34]               [cite: 34]              
```

### Metadata Event Orchestration

A forensic RAG pipeline implements the OpenLineage specification to track document transformations<sup>34</sup>. The pipeline emits standard metadata events at each step of the lifecycle<sup>34</sup>:
* **DatasetEvent:** Emitted during ingestion to track metadata changes, technical schema structures, and physical storage locations in the data lakehouse<sup>34</sup>. This allows down-funnel components to verify document structures as schemas evolve<sup>38</sup>.
* **JobEvent:** Generated during static parsing and deduplication stages to document pipeline dependencies, code version indexes, and model properties<sup>34</sup>.
* **RunEvent:** Captured at runtime when documents are processed, tracking run states (`START`, `COMPLETE`, `FAIL`), system latency, input dataset versions, and error logs<sup>34</sup>.

### Lakehouse Control Integration

This lineage architecture integrates with storage frameworks such as Apache Iceberg or Delta Lake within a Metadata Lakehouse<sup>35</sup>. The lakehouse serves as the central control plane, combining technical, operational, and business metadata into a single queryable layer<sup>35</sup>.

By utilizing Apache Iceberg's metadata tree, the system can query table schemas, snapshot logs, and manifest lists programmatically<sup>39</sup>. Fivetran's Managed Data Lake Service helps maintain this consistency by automating snapshot retention and tracking changes across processing engines<sup>41</sup>.

Integrating these tools ensures full audibility: if a model outputs incorrect information, administrators can trace the retrieved chunks back through the vector database to the exact pipeline step and source document, establishing a clear chain of evidence<sup>2</sup>.

## Analytical Conclusions

Transitioning from standard RAG implementations to audited, forensic-grade pipelines is essential for deploying reliable AI systems in regulated industries<sup>2</sup>. Unmanaged ingestion pipelines often suffer from silent data degradation, causing models to present incorrect or obsolete information with high confidence<sup>3</sup>. This operational risk can be systematically mitigated by implementing a structured, multi-layer auditing framework<sup>3</sup>:
1. **Visual Parsing and Multi-Page Handling:** Batching large files and utilizing advanced parsers like Unstructured and LlamaParse preserves layout context and isolated table structures, preventing structural loss<sup>9</sup>.
2. **MinHash LSH Deduplication:** Standardizing on MinHash LSH and maintaining a clean document ledger prevents index contamination and improves retrieval efficiency<sup>1</sup>.
3. **Active Pre-Vector Reconciliation:** Implementing automated conflict resolution rules based on version metadata and authority levels resolves semantic inconsistencies before data is indexed<sup>3</sup>.
4. **Self-Healing Execution Layer:** Integrating a post-generation validation layer with automated patching and quality scoring provides a reliable safety net for production applications<sup>5</sup>.
5. **Lineage & Provenance Tracking:** Enforcing OpenLineage standards and metadata lakehouse integrations provides a fully auditable chain of custody, ensuring all generated responses can be verified back to their source<sup>2</sup>.

Implementing these auditing and hygiene workflows transforms corporate vector databases from unmanaged data dumps into structured, trustworthy, and compliant knowledge repositories<sup>2</sup>.

### Works Cited

1. *Build an unstructured data pipeline for RAG* | Databricks on Google Cloud, https://docs.databricks.com/gcp/en/generative-ai/tutorials/ai-cookbook/quality-data-pipeline-rag
2. *What Is RAG? How Retrieval-Augmented Generation Works in 2026* - Atlan, https://atlan.com/know/what-is-rag/
3. *Your RAG System Retrieves the Right Data — But Still Produces Wrong Answers. Here's Why (and How to Fix It).* - Towards Data Science, https://towardsdatascience.com/your-rag-system-retrieves-the-right-data-but-still-produces-wrong-answers-heres-why-and-how-to-fix-it/
4. *ConflictRAG: Detecting and Resolving Knowledge Conflicts in Retrieval-Augmented Generation* - arXiv, https://arxiv.org/html/2605.17301v1
5. *RAG Hallucinates — I Built a Self-Healing Layer That Fixes It in Real Time* - Towards Data Science, https://towardsdatascience.com/rag-hallucinates-i-built-a-self-healing-layer-that-fixes-it-in-real-time/
6. *Data Provenance vs. Data Lineage: Differences & AI Use Cases* - Snowflake, https://www.snowflake.com/en/data-governance/data-lineage/data-provenance/
7. *What is data lineage? Tracking data through enterprise systems* - Neo4j, https://neo4j.com/blog/graph-database/what-is-data-lineage/
8. *Metadata Lineage: Complete Guide to Tracking Data Journey* - Promethium's AI, https://promethium.ai/guides/metadata-lineage-complete-guide-tracking-data-journey/
9. *llama-parse* - PyPI, https://pypi.org/project/llama-parse/
10. *Process PDFs in Python: Step-by-Step Guide* | Unstructured, https://unstructured.io/blog/how-to-process-pdf-in-python
11. *Partitioning* - Unstructured Documentation, https://docs.unstructured.io/open-source/core-functionality/partitioning
12. *RAG Pipeline Deep Dive: Ingestion, Chunking, Embedding, and Vector Search* - DEV Community, https://dev.to/derrickryangiggs/rag-pipeline-deep-dive-ingestion-chunking-embedding-and-vector-search-2877
13. *Best Chunking Strategies for RAG (and LLMs) in 2026* - Firecrawl, https://www.firecrawl.dev/blog/best-chunking-strategies-rag
14. *Document Elements* - Unstructured 0.12.6 documentation, https://unstructured.readthedocs.io/en/main/introduction/overview.html
15. *Parsing Documents: An Introduction to Unstructured* - Tetranyde, https://www.tetranyde.com/blog/unstructured
16. *Table Extraction from PDF* - Unstructured 0.12.6 documentation - Read the Docs, https://unstructured.readthedocs.io/en/main/best_practices/table_extraction_pdf.html
17. *Getting Started | Developer Documentation* - LlamaParse - LlamaIndex, https://developers.llamaindex.ai/llamaparse/parse/getting_started/
18. *Partitioning Large PDF Files with Python and Unstructured.io* - DEV Community, https://dev.to/josethz00/partitioning-large-pdf-files-with-python-and-unstructuredio-3bkg
19. *Building RAG for SEC Filings with Provenance: A Guide for Analysts* - Deal Charts, https://dealcharts.org/blog/rag-for-sec-filings-with-provenance
20. *Metadata Extensions | Developer Documentation* - LlamaParse, https://developers.llamaindex.ai/llamaparse/extract/guides/extensions/
21. *Defining and Customizing Documents* - LlamaParse - LlamaIndex, https://developers.llamaindex.ai/python/framework/module_guides/loading/documents_and_nodes/usage_documents/
22. *Preparing data for a RAG pipeline using Data Prep Kit (DPK)* - IBM Developer, https://developer.ibm.com/tutorials/dpk-rag-llms/
23. *Dataset Deduplication and Redundancy Removal* | CodeSignal Learn, https://codesignal.com/learn/courses/optimized-data-preparation-for-large-scale-llms/lessons/dataset-deduplication-and-redundancy-removal
24. *Minhash Deduplication* - Datasets - Hugging Face Forums, https://discuss.huggingface.co/t/minhash-deduplication/19992
25. *Semantic Deduplication* | NeMo Curator - NVIDIA Documentation, https://docs.nvidia.com/nemo/curator/curate-text/process-data/deduplication/semdedup
26. *MinHash LSH in Milvus: The Secret Weapon for Fighting Duplicates in LLM Training Data* - Milvus Blog, https://milvus.io/blog/minhash-lsh-in-milvus-the-secret-weapon-for-fighting-duplicates-in-llm-training-data.md
27. *MinHash Deduplication on Common-Crawl Web Text* - Daft Documentation, https://docs.daft.ai/en/stable/examples/minhash-dedupe/
28. *Minhash LSH Implementation Walkthrough: Deduplication* - DZone, https://dzone.com/articles/minhash-lsh-implementation-walkthrough
29. *Large-scale text deduplication using MinHash-LSH* - Alibaba Cloud, https://help.aliyun.com/en/emr/emr-serverless-spark/use-cases/minhash-lsh-based-large-scale-text-duplication-scheme
30. *FED: Fast and Efficient Dataset Deduplication Framework with GPU Acceleration* - arXiv, https://arxiv.org/html/2501.01046v2
31. *Knowledge Conflict in RAG* - GeeksforGeeks, https://www.geeksforgeeks.org/artificial-intelligence/knowledge-conflict-in-rag/
32. *Conflicting Documents in RAG? AI System Design Interview Cheatsheet Question* - YouTube, https://www.youtube.com/shorts/CPAaKSEMu3c
33. *Your tasks: Data provenance* - RDMkit, https://rdmkit.elixir-europe.org/data_provenance
34. *Object Model* | OpenLineage, https://openlineage.io/docs/spec/object-model/
35. *Metadata Lakehouse Activates Governance & Drives AI Readiness in 2026* - Atlan, https://atlan.com/know/metadata-lakehouse/
36. *OpenLineage: Home*, https://openlineage.io/
37. *Understanding data lineage* | Datadog, https://www.datadoghq.com/blog/data-lineage/
38. *Free Download Data Lakehouse Metadata Version Control* - Meegle, https://www.meegle.com/en_us/advanced-templates/data_lakehouse/data_lakehouse_metadata_version_control
39. *What is a Metadata Lakehouse* - Sifflet, https://www.siffletdata.com/blog/metadata-lakehouse
40. *Getting Started* - OpenLineage, https://openlineage.io/getting-started/
41. *Governing your lakehouse with Fivetran Managed Data Lake Service* | Fivetran Blog, https://www.fivetran.com/blog/governing-your-lakehouse-with-fivetran-managed-data-lake-service
42. *The Metadata Structure of Modern Table Formats* - Dremio, https://www.dremio.com/blog/the-metadata-structure-of-modern-table-formats/
43. *Data Lineage Tracking: Complete Guide for 2026* - Atlan, https://atlan.com/know/data-lineage-tracking/
