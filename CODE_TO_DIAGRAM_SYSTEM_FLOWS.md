# AI Code-to-Diagram Engine - System Flow Diagrams

**Version**: 2.0.0  
**Purpose**: Visual representation of all system flows and interactions  
**Format**: Mermaid diagrams with explanations

---

## 1. Real-Time Update Pipeline (Complete Flow)

```mermaid
graph TD
    A["User Types in Monaco Editor"] -->|onChange event| B["Yjs Awareness Update"]
    B -->|Collaborative State| C["useCodeDiagramEngine Hook"]
    C -->|Start Debounce Timer 300ms| D["Wait for User to Stop Typing"]
    D -->|User Still Typing| A
    D -->|300ms Elapsed| E["Call analyzeAndRender"]
    
    E -->|Code String + Language| F["CodeToDiagramEngine.detectLanguage"]
    F -->|Extension Based| G{File Extension Match}
    G -->|Yes| H["High Confidence 95%"]
    G -->|No| I["Content-Based Detection"]
    I -->|Pattern Matching| J["Confidence 60-80%"]
    H -->|Language ID| K["Compare Code Hash"]
    J -->|Language ID| K
    
    K -->|Hash Matches Cache| L["CACHE HIT ✓"]
    K -->|Hash Differs| M["Parse Code"]
    
    L -->|Retrieve from Cache| N["Return Cached Results"]
    M -->|Code + Language| O["CodeParser.analyze"]
    
    O -->|Normalize| P["Remove Comments & Whitespace"]
    P -->|Extract Functions| Q["Build FunctionDefinition[]"]
    Q -->|Extract Classes| R["Build ClassDefinition[]"]
    R -->|Extract Control Flow| S["Build ControlFlowStatement[]"]
    S -->|Extract Variables| T["Build VariableDeclaration[]"]
    T -->|Metadata| U["CodeAnalysisResult"]
    
    U -->|Raw Analysis| V["ASTBuilder.buildAST"]
    V -->|Create Nodes| W["Build Tree Structure"]
    W -->|Add References| X["Set Parent/Child Links"]
    X -->|Build Call Graph| Y["Extract Dependencies"]
    Y -->|ASTNode Tree| Z["Calculate Metrics"]
    Z -->|Complexity| AA["ASTNode (Root)"]
    
    AA -->|AST + Options| AB["DiagramGenerator.generate"]
    AB -->|Select Type| AC{Diagram Type}
    AC -->|Flowchart| AD["Generate Flowchart"]
    AC -->|Sequence| AE["Generate Sequence"]
    AC -->|State| AF["Generate State"]
    AC -->|Class| AG["Generate Class"]
    
    AD -->|AST Traversal| AH["Create Mermaid Nodes"]
    AE -->|Sequence Analysis| AH
    AF -->|State Analysis| AH
    AG -->|Class Analysis| AH
    
    AH -->|Node + Edge Info| AI["Generate Mermaid Syntax"]
    AI -->|String Output| AJ["GeneratedDiagram"]
    
    AJ -->|Diagram String| AK["CodeToDiagramEngine.renderDiagram"]
    AK -->|Validate Syntax| AL["Check Mermaid Validity"]
    AL -->|Valid| AM["Call mermaid.render"]
    AL -->|Invalid| AN["Error: Syntax Error"]
    
    AN -->|CodeDiagramError| AO["Catch & Handle Error"]
    AM -->|SVG Output| AP["Store in Cache"]
    AP -->|MermaidRenderResult| AQ["Return SVG"]
    
    AQ -->|SVG String| AR["Update React State"]
    AR -->|setCurrentSVG| AS["setCurrentDiagram"]
    AS -->|setIsLoading False| AT["Update useDiagramStore"]
    
    AT -->|Trigger Re-render| AU["React Update"]
    AU -->|New Props| AV["DiagramPanel Component"]
    AV -->|dangerouslySetInnerHTML| AW["Render SVG in DOM"]
    
    AW -->|Display to User| AX["✓ Diagram Visible"]
    N -->|From Cache| AR
    AO -->|Show Error| AY["Error Banner UI"]
```

---

## 2. Component Lifecycle & Initialization

```mermaid
graph TD
    A["SynCodex Editor Page Mounts"] -->|useEffect| B["Initialize useCodeDiagramEngine Hook"]
    B -->|Custom Hook| C["Create Engine Instance"]
    C -->|Singleton Pattern| D["CodeToDiagramEngine"]
    D -->|Initialize Config| E["Cache Size: 50 items"]
    E -->|Performance Settings| F["Parse Timeout: 5s"]
    F -->|Render Timeout: 10s| G["Engine Ready"]
    
    G -->|Parallel| H["Initialize useDiagramStore"]
    H -->|Zustand Store| I["Load Preferences from localStorage"]
    I -->|Persist Middleware| J["Load Panel Position/Size"]
    J -->|Load Theme/Type| K["Store Ready"]
    
    B -->|Attach Monaco Event| L["editor.onDidChangeModelContent"]
    L -->|Listener Active| M["Awaiting Code Changes"]
    
    K -->|Side Effect| N["Mount DiagramPanel Component"]
    N -->|Check isOpen| O{Panel Open?}
    O -->|No| P["Collapsed/Hidden"]
    O -->|Yes| Q["Render Panel"]
    Q -->|Get Initial Diagram| R["Generate from Current Code"]
    R -->|Display| S["Show Initial Diagram"]
    
    S -->|Render Complete| T["System Fully Initialized ✓"]
```

---

## 3. Diagram Type Switching Flow

```mermaid
graph TD
    A["User Selects New Diagram Type"] -->|DiagramTypeSelector Click| B["updateDiagramType(newType)"]
    B -->|dispatch| C["useCodeDiagramEngine.switchDiagramType"]
    C -->|newType| D["Update diagramType State"]
    
    D -->|Check Cache| E{Cached Result Exists?}
    E -->|Yes| F["Retrieve from Cache"]
    E -->|No| G["Generate New Diagram"]
    
    F -->|GeneratedDiagram| H["Skip AST/Parser"]
    G -->|Current AST| I["DiagramGenerator.generate"]
    I -->|AST + New Type| J["New Diagram String"]
    J -->|Store Result| K["Add to Cache"]
    
    H -->|Mermaid String| L["CodeToDiagramEngine.renderDiagram"]
    K -->|Mermaid String| L
    L -->|Render SVG| M["mermaid.render"]
    M -->|SVG Output| N["MermaidRenderResult"]
    
    N -->|Update State| O["setCurrentSVG"]
    O -->|Trigger Re-render| P["DiagramPanel Updates"]
    P -->|Smooth Transition| Q["Display New Diagram Type ✓"]
```

---

## 4. Cache Management & LRU Eviction

```mermaid
graph TD
    A["New Diagram Generated"] -->|Result Ready| B["Check Cache Size"]
    B -->|Cache Map| C{Size < 50?}
    C -->|Yes| D["Add to Cache"]
    C -->|No| E["LRU Eviction Needed"]
    
    D -->|Store with Key| F["Key: codeHash:lang:type"]
    F -->|Store with Value| G["Value: {analysis, ast, diagram, svg}"]
    G -->|Add Metadata| H["timestamp, accessCount"]
    H -->|Cache Updated| I["Return Cached Result"]
    
    E -->|Find Least Recent| J["Sort by accessCount"]
    J -->|Oldest Entry| K["Remove Oldest"]
    K -->|Free Memory| L["Re-attempt Add"]
    L -->|Now Size < 50| D
    
    I -->|On Next Request| M["Access Same Code"]
    M -->|Generate Hash| N["Check Cache"]
    N -->|Found| O["CACHE HIT!"]
    O -->|Increment accessCount| P["Update Metadata"]
    P -->|Return Cached| Q["Skip Re-processing"]
    
    N -->|Not Found| R["CACHE MISS"]
    R -->|Process Again| B
    
    S["Get Cache Statistics"] -->|Query Cache| T["Count Hits"]
    T -->|Calculate Rate| U["Hits / Total"]
    U -->|Display| V["Performance Widget"]
```

---

## 5. Error Handling & Recovery

```mermaid
graph TD
    A["Pipeline Stage Executes"] -->|Try-Catch| B{Error?}
    B -->|No| C["Continue Pipeline"]
    B -->|Yes| D["Catch Error"]
    
    D -->|Error Type| E{Type?}
    E -->|ParsingError| F["CodeParser Failed"]
    E -->|ASTError| G["ASTBuilder Failed"]
    E -->|GenerationError| H["DiagramGenerator Failed"]
    E -->|RenderingError| I["Mermaid Failed"]
    E -->|Unknown| J["Unexpected Error"]
    
    F -->|Create Error Object| K["CodeDiagramError"]
    G -->|severity: error| K
    H -->|code: ERROR_CODE| K
    I -->|message: sanitized| K
    J -->|context: metadata| K
    
    K -->|Store in Engine| L["this.lastError"]
    L -->|Log Sanitized| M["console.error"]
    M -->|No Source Code| N["Log Only Metadata"]
    
    N -->|Update UI State| O["setError"]
    O -->|Display Banner| P["Error Message to User"]
    P -->|Offer Options| Q{User Action?}
    
    Q -->|Retry| R["Clear Error"]
    R -->|Re-run Analysis| A
    Q -->|Modify Code| S["Editor Focus"]
    S -->|User Types| T["Analysis Resumes"]
    Q -->|Dismiss| U["Close Banner"]
    U -->|Keep Error State| V["Log Recorded"]
```

---

## 6. Language Detection Algorithm

```mermaid
graph TD
    A["Detect Language"] -->|Input: Code + FileExt| B{File Extension Provided?}
    B -->|Yes| C["Extract Extension"]
    C -->|Build Map| D["Map Extensions to Languages"]
    D -->|Match| E{Found?}
    E -->|Yes| F["High Confidence 95%"]
    E -->|No| G["Fall Back to Content"]
    
    B -->|No| G
    G -->|Analyze Patterns| H["Pattern Scoring"]
    H -->|JavaScript Patterns| I["Score += 2"]
    H -->|TypeScript Patterns| J["Score += 3"]
    H -->|Python Patterns| K["Score += 3"]
    H -->|Java Patterns| L["Score += 2"]
    H -->|Go Patterns| M["Score += 3"]
    H -->|Rust Patterns| N["Score += 2"]
    
    I -->|Accumulate| O["Scored Object"]
    J -->|Per Language| O
    K -->|Track Hits| O
    L -->|Total Score| O
    M -->|per Pattern| O
    N -->|Category| O
    
    O -->|Find Max| P["Sort Entries"]
    P -->|Highest Score| Q["Selected Language"]
    Q -->|Calculate| R["Confidence = Score/10"]
    R -->|Cap at 1.0| S["Final Result"]
    
    F -->|Method: extension| T["LanguageDetectionResult"]
    S -->|Method: content| T
    T -->|Return| U["Language ID ✓"]
```

---

## 7. AST Building Process

```mermaid
graph TD
    A["CodeAnalysisResult Input"] -->|Contains Functions, Classes, etc.| B["ASTBuilder.buildAST"]
    B -->|Create Root Node| C["root: ASTNode"]
    C -->|Type: BLOCK| D["Initialize Metadata"]
    
    D -->|For Each Function| E["buildFunctionNode"]
    E -->|Create Node| F["type: FUNCTION"]
    F -->|Add Name| G["name: functionName"]
    G -->|Add Parameters| H["parameters: Parameter[]"]
    H -->|Add Metadata| I["isAsync, complexity"]
    I -->|Add Children| J["bodyStatements"]
    J -->|Add to Root| K["root.children.push(node)"]
    
    K -->|For Each Class| L["buildClassNode"]
    L -->|Create Node| M["type: CLASS"]
    M -->|Add Methods| N["For Each Method"]
    N -->|Method Node| O["type: METHOD"]
    O -->|Set Parent| P["node.parent = classNode"]
    P -->|Add to Class| Q["classNode.children.push(method)"]
    Q -->|Add Class to Root| R["root.children.push(classNode)"]
    
    R -->|For Each Control Flow| S["buildControlFlowNode"]
    S -->|IfStatement| T["type: IF_STATEMENT"]
    S -->|ForLoop| U["type: FOR_LOOP"]
    S -->|TryCatch| V["type: TRY_CATCH"]
    
    T -->|Recursive Children| W["Process Nested Blocks"]
    U -->|Build Subtree| W
    V -->|Add Catch Handler| W
    W -->|Set Parents| X["Link to Parent"]
    X -->|Add to Parent| Y["parent.children.push(node)"]
    
    Y -->|Build Complete| Z["Extract Call Graph"]
    Z -->|findNodesByType| AA["Find All Function Calls"]
    AA -->|Build Edges| AB["callGraph: CallNode[]"]
    AB -->|Final AST| AC["Complete ASTNode Tree ✓"]
```

---

## 8. Mermaid Rendering Pipeline

```mermaid
graph TD
    A["GeneratedDiagram"] -->|Mermaid String| B["CodeToDiagramEngine.renderDiagram"]
    B -->|Input: Diagram + Options| C["Extract Options"]
    C -->|theme: DARK/LIGHT| D["Set Rendering Config"]
    D -->|width: 800| E["Set Dimensions"]
    E -->|height: 600| F["Prepare Render Context"]
    
    F -->|Validate| G["Check Mermaid Syntax"]
    G -->|RegEx Patterns| H{Valid?}
    H -->|No| I["throw SyntaxError"]
    H -->|Yes| J["Syntax Valid"]
    
    I -->|Error Object| K["CodeDiagramError"]
    K -->|type: MERMAID_SYNTAX_ERROR| L["Return Error"]
    
    J -->|Call mermaid| M["mermaid.render(diagram)"]
    M -->|Browser Rendering| N["Parse Mermaid AST"]
    N -->|Layout Calculation| O["Position Nodes"]
    O -->|Draw Edges| P["Connect Relationships"]
    P -->|Apply Styling| Q["Set Colors/Fonts"]
    Q -->|Generate SVG| R["SVG String Output"]
    
    R -->|SVG DOM| S["Create SVG Element"]
    S -->|Interactive| T["Add Event Listeners"]
    T -->|Hover Effects| U["Highlight Nodes"]
    U -->|Click Handler| V["Navigate to Code"]
    
    V -->|Return Result| W["MermaidRenderResult"]
    W -->|svgContent: string| X["renderTime: number"]
    X -->|success: boolean| Y["Complete ✓"]
    
    Y -->|Cache SVG| Z["Store in Memory"]
```

---

## 9. User Interaction: Node Selection & Code Linking

```mermaid
graph TD
    A["Diagram Panel Rendered"] -->|SVG Displayed| B["User Hovers Over Node"]
    B -->|mouseenter| C["Highlight Node"]
    C -->|CSS Class| D["Add .highlighted"]
    D -->|Visual Effect| E["Node Brightens"]
    
    E -->|User Clicks| F["mouseclick"]
    F -->|Get Node ID| G["Extract nodeId"]
    G -->|useDiagramStore| H["setSelectedNode"]
    H -->|Store State| I["Store Node Info"]
    I -->|Find Code Location| J["Search AST"]
    
    J -->|Get lineStart| K["Find AST Node"]
    K -->|Get lineEnd| L["Calculate Range"]
    L -->|Monaco API| M["editor.revealLineInCenter"]
    M -->|Scroll| N["Center Line in Editor"]
    N -->|Select Range| O["editor.setSelection"]
    O -->|Highlight| P["Code Highlighted ✓"]
    
    P -->|Visual Link| Q["User Sees"]
    Q -->|Diagram Node| R["↔"]
    R -->|Code Location| S["Connected"]
    
    S -->|User Clicks Other Node| F
```

---

## 10. Export Diagram Flow

```mermaid
graph TD
    A["User Clicks Export"] -->|Select Format| B{Format?}
    B -->|SVG| C["Export as SVG"]
    B -->|PNG| D["Export as PNG"]
    B -->|JSON| E["Export as JSON"]
    
    C -->|Get SVG String| F["currentSVG.svgContent"]
    F -->|Create Blob| G["new Blob([svg])"]
    G -->|Create URL| H["URL.createObjectURL"]
    H -->|Trigger Download| I["<a href=#> click"]
    I -->|Browser Save| J["diagram.svg"]
    
    D -->|Get SVG| K["currentSVG.svgContent"]
    K -->|Create Canvas| L["document.createElement('canvas')"]
    L -->|Load SVG| M["Load Image Source"]
    M -->|Draw to Canvas| N["ctx.drawImage"]
    N -->|Get PNG| O["canvas.toBlob"]
    O -->|Trigger Download| P["diagram.png"]
    
    E -->|Get Diagram| Q["currentDiagram"]
    Q -->|Serialize| R["JSON.stringify"]
    R -->|Add Metadata| S["{ diagram, type, language, timestamp }"]
    S -->|Create Blob| T["new Blob([json])"]
    T -->|Create URL| U["URL.createObjectURL"]
    U -->|Trigger Download| V["diagram.json"]
    
    J -->|File Saved| W["Success Notification"]
    P -->|File Saved| W
    V -->|File Saved| W
```

---

## 11. State Management Flow (Zustand Store)

```mermaid
graph TD
    A["Component Mounts"] -->|Import Hook| B["useDiagramStore()"]
    B -->|Initialize| C["Load from localStorage"]
    C -->|Persist Middleware| D["Get Saved State"]
    D -->|Hydrate| E["Apply to Store"]
    E -->|Return Store| F["Store Instance"]
    
    F -->|Subscribe| G["useShallow"]
    G -->|Granular Updates| H["Only Selected Fields"]
    H -->|Component Re-renders| I{Selective Update}
    I -->|Depends on| J["isOpen changed"]
    I -->|Depends on| K["zoomLevel changed"]
    I -->|Depends on| L["currentDiagram changed"]
    
    J -->|Yes| M["Re-render Panel"]
    K -->|Yes| M
    L -->|Yes| M
    M -->|Optimize| N["Skip Other Components"]
    
    O["User Changes Setting"] -->|setTheme| P["Update Store"]
    P -->|Set State| Q["theme: newTheme"]
    Q -->|Trigger Save| R["Persist to localStorage"]
    R -->|JSON Serialize| S["localStorage.setItem"]
    S -->|Saved| T["Setting Persisted ✓"]
    
    T -->|Next Session| U["Load Saved Setting"]
    U -->|Bootstrap| V["User Preference Retained"]
```

---

## 12. Performance Monitoring & Metrics

```mermaid
graph TD
    A["Pipeline Starts"] -->|performance.now()| B["Start Time"]
    
    B -->|Parser Step| C["Parser Start"]
    C -->|Parse Complete| D["Parser End"]
    D -->|Calculate| E["parsingTimeMs = End - Start"]
    
    E -->|AST Step| F["AST Builder Start"]
    F -->|Build Complete| G["AST Builder End"]
    G -->|Calculate| H["astBuildingTimeMs"]
    
    H -->|Generator Step| I["Generator Start"]
    I -->|Generate Complete| J["Generator End"]
    J -->|Calculate| K["diagramGenerationTimeMs"]
    
    K -->|Renderer Step| L["Renderer Start"]
    L -->|Render Complete| M["Renderer End"]
    M -->|Calculate| N["renderingTimeMs"]
    
    N -->|Total| O["totalTimeMs = Sum"]
    O -->|Check Cache| P{Cache Hit?}
    P -->|Yes| Q["cacheHit = true"]
    P -->|No| R["cacheHit = false"]
    
    Q -->|Memory| S["Get Memory Usage"]
    R -->|Memory| S
    S -->|performance.memory| T["memoryUsedMb"]
    T -->|Create Metrics| U["DiagramPerformanceMetrics"]
    
    U -->|Store| V["lastMetrics"]
    V -->|Display| W["Performance Widget"]
    W -->|Show User| X["Parse: 150ms | Render: 300ms"]
```

---

## 13. Browser Compatibility Check

```mermaid
graph TD
    A["App Initializes"] -->|Feature Detection| B["Check Browser APIs"]
    B -->|Check| C["performance.now()"]
    B -->|Check| D["Array.from()"]
    B -->|Check| E["Map/Set"]
    B -->|Check| F["Promise"]
    B -->|Check| G["Worker Support"]
    
    C -->|Available| H["✓"]
    D -->|Available| I["✓"]
    E -->|Available| J["✓"]
    F -->|Available| K["✓"]
    G -->|Available| L["✓ (Optional)"]
    
    H -->|All Present| M["Check Mermaid"]
    I -->|All Present| M
    J -->|All Present| M
    K -->|All Present| M
    
    M -->|Check Version| N["mermaid >= 10.9"]
    N -->|Compatible| O["Enable Full Features"]
    N -->|Too Old| P["Show Update Notice"]
    O -->|Proceed| Q["System Ready ✓"]
    
    G -->|Not Available| R["Disable Workers"]
    R -->|Use Main Thread| S["Fallback Mode"]
    S -->|Show Warning| T["Workers not supported"]
    T -->|Continue| Q
```

---

## 14. Collaborative Editing Integration (Yjs)

```mermaid
graph TD
    A["Multiple Users Editing"] -->|Yjs Awareness| B["User A Types"]
    B -->|onChange Event| C["Local Change"]
    C -->|Yjs Sync| D["Broadcast to Server"]
    D -->|WebSocket| E["Server Relays"]
    E -->|Other Clients| F["User B Receives"]
    
    F -->|Update Local State| G["Monaco Updates"]
    G -->|Trigger Hook| H["useCodeDiagramEngine"]
    H -->|Debounce 300ms| I["Wait for Edits"]
    I -->|Process| J["Analyze Code"]
    
    J -->|Generate| K["Create Diagram"]
    K -->|Awareness| L["Diagram ID in Awareness"]
    L -->|Share State| M["Other Users See"]
    M -->|Same Diagram| N["Synchronized View ✓"]
    
    O["User A Exports"] -->|Save Diagram| P["Local Download"]
    Q["User B Exports"] -->|Same Code| R["Same Diagram Export"]
```

---

## 15. Memory Lifecycle & Cleanup

```mermaid
graph TD
    A["App Initialize"] -->|Memory| B["Engine Instance: ~5MB"]
    B -->|Cache| C["Empty: 0MB"]
    C -->|Ready| D["Total: 5MB"]
    
    E["First Diagram"] -->|Parse: 1MB| F["AST: 2MB"]
    F -->|Diagram: 0.5MB| G["SVG: 0.5MB"]
    G -->|Store in Cache| H["Total: 9MB"]
    
    I["Second Diagram"] -->|Different Code| J["Parse: 1MB"]
    J -->|AST: 2MB| K["Diagram: 0.5MB"]
    K -->|SVG: 0.5MB| L["Cache Item 2: 4MB"]
    L -->|Total: 13MB"]
    
    M["Continue..."] -->|Item 3| N["Total: 17MB"]
    N -->|Item 4| O["Total: 21MB"]
    O -->|Item 5| P["Total: 25MB"]
    P -->|...| Q["Item 50"]
    Q -->|Total: ~40MB"]
    
    R["Cache Full"] -->|New Item| S["LRU Eviction"]
    S -->|Remove Oldest| T["Free 4MB"]
    T -->|Add New| U["Stay at 40MB"]
    
    V["Browser Memory Pressure"] -->|Event| W["Clear Cache"]
    W -->|All Entries| X["0MB"]
    X -->|Keep Engine| Y["5MB Retained"]
    Y -->|Recovery| Z["Ready for Next"]
```

---

## Summary

These diagrams represent:

1. **Real-Time Update Pipeline**: Complete flow from typing to diagram display
2. **Component Lifecycle**: Initialization and mounting sequence
3. **Diagram Type Switching**: Changing diagram types efficiently
4. **Cache Management**: LRU eviction and hit/miss scenarios
5. **Error Handling**: Error detection, logging, and recovery
6. **Language Detection**: Multi-language detection algorithm
7. **AST Building**: Tree construction and relationship mapping
8. **Mermaid Rendering**: SVG generation pipeline
9. **User Interaction**: Node selection and code linking
10. **Export Functionality**: Multiple export format support
11. **State Management**: Zustand store with persistence
12. **Performance Monitoring**: Metrics collection and tracking
13. **Browser Compatibility**: Feature detection and fallbacks
14. **Collaborative Editing**: Yjs integration
15. **Memory Lifecycle**: Memory allocation and cleanup

---

**Document Version**: 2.0.0  
**Last Updated**: May 2026  
**Format**: Mermaid Diagram Language  
**Status**: ✅ Complete & Production Ready
