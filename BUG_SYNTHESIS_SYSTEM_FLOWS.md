# Bug Synthesis Engine - System Flow Diagrams

## DIAGRAM 1: Real-Time Code Analysis Pipeline (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User as User (Monaco)
    participant Frontend as Frontend React
    participant IPC as IPC/WebSocket
    participant Ingestion as Code Ingestion
    participant ThreatEngine as Threat Synthesis
    participant Analyzers as 7 Parallel Analyzers
    participant Synthesizer as Vuln Synthesizer
    participant DefenseEngine as Defense Mapper
    participant KB as Local KB (SQLite)
    participant UI as UI Components

    User->>Frontend: Edit Code (keystroke)
    activate Frontend
    Frontend->>Frontend: Debounce 500ms
    
    User->>Frontend: Code stable
    Frontend->>IPC: Send code_update message
    deactivate Frontend
    
    activate IPC
    IPC->>Ingestion: Code + metadata
    deactivate IPC
    
    activate Ingestion
    Ingestion->>Ingestion: Tokenize
    Ingestion->>Ingestion: Parse AST (babel)
    Ingestion->>Ingestion: Build Data Flow Graph
    Ingestion->>Ingestion: Initialize Taint Markers
    Ingestion->>ThreatEngine: AST + DFG + Taint Info
    deactivate Ingestion
    
    activate ThreatEngine
    
    par Parallel Analysis
        activate Analyzers
        Analyzers->>KB: Fetch patterns
        Analyzers->>Analyzers: Pattern Matching
        Analyzers->>Analyzers: Regex + Semantic
        Analyzers->>ThreatEngine: Findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>Analyzers: Taint Analysis
        Analyzers->>Analyzers: Track data flow
        Analyzers->>Analyzers: Source → Sink detection
        Analyzers->>ThreatEngine: Taint findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>Analyzers: Control Flow Analysis
        Analyzers->>Analyzers: Exception handling check
        Analyzers->>ThreatEngine: CFG findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>Analyzers: Type Safety Check
        Analyzers->>Analyzers: Type confusion detect
        Analyzers->>ThreatEngine: Type findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>KB: Crypto standards
        Analyzers->>Analyzers: Crypto Validation
        Analyzers->>ThreatEngine: Crypto findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>Analyzers: Auth/AuthZ Analysis
        Analyzers->>Analyzers: Session validation
        Analyzers->>ThreatEngine: Auth findings
        deactivate Analyzers
        
        activate Analyzers
        Analyzers->>KB: OWASP rules
        Analyzers->>Analyzers: OWASP Detection
        Analyzers->>ThreatEngine: OWASP findings
        deactivate Analyzers
    end
    
    activate Synthesizer
    ThreatEngine->>Synthesizer: Consolidated findings
    Synthesizer->>Synthesizer: Deduplicate
    Synthesizer->>Synthesizer: Calculate CVSS scores
    Synthesizer->>Synthesizer: Confidence scoring
    Synthesizer->>Synthesizer: Classify (CWE/OWASP)
    Synthesizer->>Synthesizer: Remove false positives
    deactivate ThreatEngine
    deactivate Synthesizer
    
    activate DefenseEngine
    Synthesizer->>DefenseEngine: Vulnerability list
    
    loop For each vulnerability
        DefenseEngine->>KB: Fetch secure patches
        DefenseEngine->>DefenseEngine: Generate fix 1
        DefenseEngine->>DefenseEngine: Generate fix 2
        DefenseEngine->>DefenseEngine: Generate fix 3
        DefenseEngine->>DefenseEngine: Validate syntax
        DefenseEngine->>DefenseEngine: Score confidence
        DefenseEngine->>DefenseEngine: Rank by effectiveness
    end
    deactivate DefenseEngine
    
    DefenseEngine->>IPC: Vulnerabilities + Patches
    activate IPC
    IPC->>UI: Update event
    deactivate IPC
    
    activate UI
    UI->>UI: Calculate Defense Score
    UI->>UI: Update sidebar
    UI->>UI: Render inline decorations
    UI->>UI: Display threat indicators
    UI->>Frontend: Render components
    deactivate UI
    
    activate Frontend
    Frontend->>User: Display results
    deactivate Frontend
```

---

## DIAGRAM 2: Defense Score Calculation Flow

```mermaid
graph TD
    A["Vulnerability List<br/>From Synthesizer"] -->|For Each Vuln| B["Extract:<br/>- Severity<br/>- Confidence<br/>- CWE ID"]
    
    B --> C["Calculate Weight<br/>Severity×Confidence"]
    
    C --> D["Aggregate<br/>Sum All Weights"]
    
    D --> E["Calculate Raw Score<br/>1 - Sum/MaxPossible"]
    
    E --> F["Apply Normalization<br/>×100"]
    
    F --> G["Defense Score<br/>0-100"]
    
    G --> H{Score Range}
    
    H -->|90-100| I["🟢 EXCELLENT<br/>Secure Code"]
    H -->|70-89| J["🟡 GOOD<br/>Minor Issues"]
    H -->|50-69| K["🟠 WARNING<br/>Attention Needed"]
    H -->|0-49| L["🔴 CRITICAL<br/>Immediate Action"]
    
    I --> M["Display in Sidebar<br/>with Green Indicator"]
    J --> M
    K --> M
    L --> M
```

---

## DIAGRAM 3: Taint Analysis Flow (Data Flow Tracking)

```mermaid
graph TD
    A["Code Input"] --> B["Identify Sources<br/>- User Input<br/>- Network<br/>- File I/O<br/>- Environment"]
    
    B --> C["Mark Sources<br/>as TAINTED"]
    
    C --> D["Trace Data Flow<br/>Through Code"]
    
    D --> E{Data Reaches<br/>Dangerous Sink?}
    
    E -->|Yes| F{Is Data<br/>Sanitized?}
    
    F -->|No| G["🔴 VULNERABILITY<br/>Injection Risk"]
    
    F -->|Yes| H["✅ Safe<br/>Sanitization Valid"]
    
    E -->|No| I["✅ Safe<br/>Not a Sink"]
    
    G --> J["Create Vulnerability<br/>Record"]
    
    J --> K["Generate Patch<br/>- Add sanitizer<br/>- Change API<br/>- Use safe alternative"]
```

---

## DIAGRAM 4: Patch Generation & Validation Flow

```mermaid
graph TD
    A["Vulnerability<br/>Detected"] --> B["Identify:<br/>- Root Cause<br/>- Vulnerable Pattern<br/>- Context"]
    
    B --> C["Query Knowledge Base<br/>for Fix Patterns"]
    
    C --> D["Generate 3 Patch<br/>Alternatives"]
    
    D --> E["Patch 1:<br/>Minimal Change"]
    D --> F["Patch 2:<br/>Best Practice"]
    D --> G["Patch 3:<br/>Architectural"]
    
    E --> H["Validate<br/>Syntax"]
    F --> H
    G --> H
    
    H --> I{Parse<br/>Success?}
    
    I -->|No| J["❌ Discard<br/>Invalid Patch"]
    
    I -->|Yes| K["Type Check<br/>Compatibility"]
    
    K --> L{Type<br/>Valid?}
    
    L -->|No| M["⚠️ Flag<br/>Type Mismatch"]
    
    L -->|Yes| N["Score Patch<br/>- Complexity<br/>- Breaking Changes<br/>- Performance Impact"]
    
    N --> O["Calculate<br/>Confidence 0-1"]
    
    O --> P{Confidence<br/>≥0.7?}
    
    P -->|Yes| Q["✅ Recommend<br/>Patch to User"]
    
    P -->|No| R["📚 Display<br/>as Reference"]
    
    Q --> S["Display in UI<br/>with Apply Button"]
    R --> S
```

---

## DIAGRAM 5: Integration with Monaco Editor

```mermaid
graph LR
    A["Monaco Editor<br/>Code Change"] -->|onChange Event| B["Extract Code<br/>& Position"]
    
    B -->|Debounce| C["Aggregate Changes<br/>500ms"]
    
    C --> D["Send to<br/>Analysis Engine"]
    
    D --> E["Receive:<br/>- Vulnerabilities<br/>- Patches<br/>- Metadata"]
    
    E --> F["Create Monaco<br/>Decorations"]
    
    F --> G["Add Inline<br/>Error Markers"]
    
    F --> H["Add Code<br/>Actions"]
    
    G --> I["Red Squiggles<br/>CRITICAL"]
    G --> J["Yellow Squiggles<br/>HIGH/MEDIUM"]
    G --> K["Green Info Icons<br/>Info-level"]
    
    H --> L["'Apply Patch'<br/>Code Action"]
    H --> M["'Show Alternatives'<br/>Code Action"]
    H --> N["'Learn More'<br/>Code Action"]
    
    I --> O["Monaco Decorations<br/>Rendered"]
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O
    
    O --> P["Real-time<br/>Visual Feedback<br/>to User"]
```

---

## DIAGRAM 6: Confidence Scoring Algorithm

```mermaid
graph TD
    A["Vulnerability<br/>Finding"] --> B["Extract Factors"]
    
    B --> C["Pattern Specificity<br/>0-1"]
    B --> D["Context Match<br/>0-1"]
    B --> E["Historical Accuracy<br/>0-1"]
    B --> F["Code Style Consistency<br/>0-1"]
    
    C --> G["Apply Weights"]
    D --> G
    E --> G
    F --> G
    
    G --> H["Weight Factors:<br/>- Specificity: 40%<br/>- Context: 30%<br/>- History: 20%<br/>- Style: 10%"]
    
    H --> I["Calculate Weighted<br/>Sum"]
    
    I --> J{Confidence<br/>Score}
    
    J -->|0.9-1.0| K["HIGH CONFIDENCE<br/>Safe to Auto-Apply"]
    J -->|0.7-0.9| L["MEDIUM CONFIDENCE<br/>Recommend Review"]
    J -->|0.5-0.7| M["LOW CONFIDENCE<br/>Reference Only"]
    J -->|<0.5| N["VERY LOW<br/>Not Recommended"]
```

---

## DIAGRAM 7: Authorization & Privilege Flow Detection

```mermaid
graph TD
    A["Code Analyzed"] --> B["Identify:<br/>- Auth Checks<br/>- Permission Calls<br/>- Role Validations"]
    
    B --> C["Map Call Graph:<br/>Function A → B → C"]
    
    C --> D["For Each Admin<br/>Function"]
    
    D --> E{Auth Check<br/>Present?}
    
    E -->|No| F["🔴 CRITICAL<br/>Missing Auth"]
    E -->|Yes| G["Extract Check<br/>Logic"]
    
    G --> H{Check is<br/>Correct?}
    
    H -->|No| I["🟡 HIGH<br/>Insufficient Auth"]
    H -->|Yes| J["✅ SAFE<br/>Auth Valid"]
    
    F --> K["Generate Patch:<br/>Add Auth Call"]
    I --> L["Generate Patch:<br/>Fix Auth Logic"]
    
    K --> M["Return<br/>Vulnerability +<br/>Patch"]
    L --> M
    J --> N["No Issue<br/>Return Safe Status"]
```

---

## DIAGRAM 8: Cryptography Validation Pipeline

```mermaid
graph TD
    A["Code with Crypto<br/>Operations"] --> B["Identify:<br/>- Algorithm Used<br/>- Key Length<br/>- Mode/Padding<br/>- RNG Source"]
    
    B --> C["Query Crypto<br/>Standards DB"]
    
    C --> D{Algorithm<br/>Approved?}
    
    D -->|No| E["🔴 CRITICAL<br/>Weak Algorithm"]
    D -->|Yes| F["Check Key<br/>Length"]
    
    F --> G{Key Length<br/>≥ Min Required?}
    
    G -->|No| H["🟡 HIGH<br/>Weak Key"]
    G -->|Yes| I["Check Mode/<br/>Padding"]
    
    I --> J{Secure Mode?<br/>e.g. GCM, CBC}
    
    J -->|No| K["🟡 HIGH<br/>Insecure Mode"]
    J -->|Yes| L["Check RNG<br/>Quality"]
    
    L --> M{Using<br/>Math.random()?}
    
    M -->|Yes| N["🔴 CRITICAL<br/>Weak RNG"]
    M -->|No| O["✅ SAFE<br/>Crypto Valid"]
    
    E --> P["Generate Patch:<br/>Use approved algo"]
    H --> Q["Generate Patch:<br/>Increase key length"]
    K --> R["Generate Patch:<br/>Change to GCM"]
    N --> S["Generate Patch:<br/>Use crypto.random"]
```

---

## DIAGRAM 9: SQL Injection Detection & Patching

```mermaid
graph TD
    A["Code with Database<br/>Operations"] --> B["Identify Query<br/>Construction"]
    
    B --> C{String<br/>Concatenation?}
    
    C -->|Yes| D{User Input<br/>in String?}
    
    D -->|Yes| E["🔴 CRITICAL<br/>SQL Injection Risk"]
    
    D -->|No| F["Check if Safe<br/>Constant Only"]
    
    F --> G{Safe?}
    
    G -->|Yes| H["✅ SAFE"]
    G -->|No| I["Analyze<br/>String Parts"]
    
    C -->|No| J{Using<br/>Parameterized<br/>Query?}
    
    J -->|Yes| K["✅ SAFE<br/>Protected"]
    J -->|No| L["Check ORM<br/>Safety Features"]
    
    E --> M["Generate Patches:"]
    M --> N["Patch 1:<br/>Use parameterized<br/>queries"]
    M --> O["Patch 2:<br/>Use query builder<br/>ORM"]
    M --> P["Patch 3:<br/>Add input<br/>validation"]
    
    N --> Q["Display<br/>Patches to User"]
    O --> Q
    P --> Q
```

---

## DIAGRAM 10: Sidebar Defense Score Widget

```mermaid
graph TD
    A["Defense Score<br/>Calculated"] --> B{Score<br/>Range?}
    
    B -->|90-100| C["🟢 EXCELLENT"]
    B -->|70-89| D["🟡 GOOD"]
    B -->|50-69| E["🟠 WARNING"]
    B -->|0-49| F["🔴 CRITICAL"]
    
    C --> G["Green Background<br/>bg-gray-900 + green-600"]
    D --> G
    E --> H["Orange Background<br/>bg-gray-900 + orange-500"]
    F --> I["Red Background<br/>bg-gray-900 + red-600"]
    
    G --> J["Sidebar Widget"]
    H --> J
    I --> J
    
    J --> K["Display Components:"]
    K --> L["Score Indicator<br/>0-100 with gauge"]
    K --> M["Vulnerability Count<br/>by Severity"]
    K --> N["Quick Actions<br/>- Review All<br/>- Auto-Fix<br/>- Export Report"]
    
    L --> O["Dark Theme"]
    M --> O
    N --> O
    
    O --> P["Rendered in<br/>SynCodex Sidebar<br/>bg-gray-900"]
```

---

## Performance Characteristics

```mermaid
graph LR
    A["1000-line<br/>File"] -->|Code Ingestion<br/>100ms| B["AST + DFG<br/>Built"]
    
    B -->|Parallel Analysis<br/>300ms| C["All 7 Analyzers<br/>Complete"]
    
    C -->|Vulnerability<br/>Synthesis<br/>50ms| D["30-50<br/>Vulns Found"]
    
    D -->|Patch Generation<br/>100ms| E["60-150<br/>Patches Ready"]
    
    E -->|Total: ~550ms| F["Results Sent<br/>to Frontend"]
    
    F -->|UI Rendering<br/><100ms| G["User Sees<br/>Results"]
    
    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e9
    style E fill:#fce4ec
    style F fill:#f1f8e9
    style G fill:#e0f2f1
```

