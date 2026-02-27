# agents/generator/generator.py
"""
ODRL Generator Agent (GA) v4.0
Universal ODRL Turtle generator with domain-specific prefix support
Generates ODRL policies from parsed data with SHACL compliance
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from utils.llm_factory import LLMFactory
import uuid
import logging

logger = logging.getLogger(__name__)

# ===== GENERATION PROMPTS =====
FRESH_GENERATION_PROMPT = """You are a universal ODRL policy generator. Create valid ODRL policies in Turtle format for ANY domain.

## CRITICAL RULES:

### 1. Standard Prefixes (ALWAYS include):
```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
```

### 2. Domain-Specific Prefixes (add when needed):
**For Cultural Heritage / Data Space policies:**
```turtle
@prefix drk: <http://w3id.org/drk/ontology/> .
```

**For other domains, use appropriate prefixes:**
```turtle
@prefix ex: <http://example.com/> .
```

**How to choose:**
- If parsed_data mentions "drk:", "Daten Raumkultur", "DRK", or cultural heritage context → use `@prefix drk:`
- If specific domain URIs are present in parsed_data → include those prefixes
- Otherwise use `@prefix ex:` as fallback

### 3. Policy Structure:
```turtle
<policy_uri> a odrl:Policy, <policy_type> ;
    odrl:uid <policy_uri> ;
    dct:title "Policy Title"@en ;
    dct:description "Human-readable description of what this policy allows/prohibits"@en ;
    dct:creator <creator_uri> ;
    dct:created "2025-01-16T00:00:00Z"^^xsd:dateTime ;
    odrl:permission [ ... ] ;
    odrl:prohibition [ ... ] ;
    odrl:duty [ ... ] .
```

**Policy Types Definition:**
- odrl:Set (generic policy collection. An ODRL Policy of subclass Set represents any combination of Rules. The Set Policy subclass is also the default subclass of Policy (if none is specified).)
- odrl:Offer (provider offers to recipients. An ODRL Policy of subclass Offer represents Rules that are being offered from assigner Parties. An Offer is typically used to make available Policies to a wider audience, but does not grant any Rules. An ODRL Policy of subclass Offer: MUST have one assigner property value (of type Party) to indicate the functional role in the same Rules.)
- odrl:Agreement (binding agreement between parties. An ODRL Policy of subclass Agreement represents Rules that have been granted from assigner to assignee Parties. An Agreement is typically used to grant the terms of the Rules between the Parties. An ODRL Policy of subclass Agreement: MUST have one assigner property value (of type Party) to indicate the functional role in the same Rules. MUST have one assignee property value (of type Party) to indicate the functional role in the same Rules.)



### 4. Permission/Prohibition Structure:
```turtle
odrl:permission [
    a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target <asset_uri> ;
    odrl:assignee <party_uri> ;
    odrl:assigner <provider_uri> ;
    odrl:constraint [ ... ] ;
    odrl:duty [ ... ] ;
] .
```

### 5. Constraint Structure:
```turtle
odrl:constraint [
    a odrl:Constraint ;
    odrl:leftOperand odrl:dateTime ;
    odrl:operator odrl:lteq ;
    odrl:rightOperand "2025-12-31"^^xsd:date ;
    rdfs:comment "Constraint explanation"@en ;
] .
```

### 6. ODRL Operators (ONLY use these):
**Comparison:**
- odrl:eq (equals)
- odrl:lt (less than)
- odrl:gt (greater than)
- odrl:lteq (less than or equal)
- odrl:gteq (greater than or equal)
- odrl:neq (not equal)

**Set operations:**
- odrl:isA (instance of)
- odrl:hasPart (contains)
- odrl:isPartOf (contained in)
- odrl:isAllOf (all of set)
- odrl:isAnyOf (any of set)
- odrl:isNoneOf (none of set)

### 7. ODRL leftOperands:
- odrl:dateTime (with ^^xsd:date or ^^xsd:dateTime)
- odrl:count (with ^^xsd:integer)
- odrl:spatial (with URI)
- odrl:purpose (with URI or string)
- odrl:recipient (with URI)
- odrl:elapsedTime (with xsd:duration)
- odrl:fileSize (with ^^xsd:decimal and unit)
- odrl:event (with URI)
- odrl:industry (with URI)
- odrl:language (with language code)

### 8. Valid ODRL Actions:
**Access:** odrl:read, odrl:use, odrl:index, odrl:search
**Creation:** odrl:reproduce, odrl:derive, odrl:modify, odrl:write
**Distribution:** odrl:distribute, odrl:present, odrl:display, odrl:play
**Management:** odrl:delete, odrl:archive, odrl:install, odrl:uninstall
**Execution:** odrl:execute, odrl:stream
**Communication:** odrl:attribute, odrl:inform, odrl:compensate

Detailed Description of Actions:
  "odrl:use": "To use the Asset Use is the most generic action for all non-third-party usage. More specific types of the use action can be expressed by more targetted actions.",
  "odrl:grantUse": "To grant the use of the Asset to third parties. This action enables the assignee to create policies for the use of the Asset for third parties. The nextPolicy is recommended to be agreed with the third party. Use of temporal constraints is recommended.",
  "odrl:compensate": "To compensate by transfer of some amount of value, if defined, for using or selling the Asset. The compensation may use different types of things with a value: (i) the thing is expressed by the value (term) of the Constraint name; (b) the value is expressed by operator, rightOperand, dataType and unit. Typically the assignee will compensate the assigner, but other compensation party roles may be used.",
  "odrl:acceptTracking": "To accept that the use of the Asset may be tracked. The collected information may be tracked by the Assigner, or may link to a Party with the role 'trackingParty' function.",
  "odrl:aggregate": "To use the Asset or parts of it as part of a composite collection.",
  "odrl:annotate": "To add explanatory notations/commentaries to the Asset without modifying the Asset in any other way.",
  "odrl:anonymize": "To anonymize all or parts of the Asset. For example, to remove identifying particulars for statistical or for other comparable purposes, or to use the Asset without stating the author/source.",
  "odrl:append": "The act of adding to the end of an asset.",
  "odrl:appendTo": "The act of appending data to the Asset without modifying the Asset in any other way.",
  "odrl:archive": "To store the Asset (in a non-transient form). Temporal constraints may be used for temporal conditions.",
  "odrl:attribute": "To attribute the use of the Asset. May link to an Asset with the attribution information. May link to a Party with the role â€œattributedPartyâ€ function.",
  "odrl:concurrentUse": "To create multiple copies of the Asset that are being concurrently used.",
  "odrl:copy": "The act of making an exact reproduction of the asset.",
  "odrl:delete": "To permanently remove all copies of the Asset after it has been used. Use a constraint to define under which conditions the Asset must be deleted.",
  "odrl:derive": "To create a new derivative Asset from this Asset and to edit or modify the derivative. A new asset is created and may have significant overlaps with the original Asset. (Note that the notion of whether or not the change is significant enough to qualify as a new asset is subjective). To the derived Asset a next policy may be applied.",
  "odrl:digitize": "To produce a digital copy of (or otherwise digitize) the Asset from its analogue form.",
  "odrl:display": "To create a static and transient rendition of an Asset. For example, displaying an image on a screen. If the action is to be performed to a wider audience than just the Assignees, then the Recipient constraint is recommended to be used.",
  "odrl:distribute": "To supply the Asset to third-parties. It is recommended to use nextPolicy to express the allowable usages by third-parties.",
  "odrl:ensureExclusivity": "To ensure that the Rule on the Asset is exclusive. If used as a Duty, the assignee should be explicitly indicated as the party that is ensuring the exclusivity of the Rule.",
  "odrl:execute": "To run the computer program Asset. For example, machine executable code or Java such as a game or application.",
  "odrl:export": "The act of transforming the asset into a new form.",
  "odrl:extract": "To extract parts of the Asset and to use it as a new Asset. A new asset is created and may have very little in common with the original Asset. (Note that the notion of whether or not the change is significant enough to qualify as a new asset is subjective). To the extracted Asset a next policy may be applied.",
  "odrl:give": "To transfer the ownership of the Asset to a third party without compensation and while deleting the original asset.",
  "odrl:include": "To include other related assets in the Asset. For example: bio picture must be included in the attribution. Use of a relation sub-property is required for the related assets.",
  "odrl:index": "To record the Asset in an index. For example, to include a link to the Asset in a search engine database.",
  "odrl:inform": "To inform that an action has been performed on or in relation to the Asset. May link to a Party with the role 'informedParty' function.",
  "odrl:install": "To load the computer program Asset onto a storage device which allows operating or running the Asset.",
  "odrl:lease": "The act of making available the asset to a third-party for a fixed period of time with exchange of value.",
  "odrl:license": "The act of granting the right to use the asset to a third-party.",
  "odrl:lend": "The act of making available the asset to a third-party for a fixed period of time without exchange of value.",
  "odrl:modify": "To change existing content of the Asset. A new asset is not created by this action. This action will modify an asset which is typically updated from time to time without creating a new asset. If the result from modifying the asset should be a new asset the actions derive or extract should be used. (Note that the notion of whether or not the change is significant enough to qualify as a new asset is subjective).",
  "odrl:move": "To move the Asset from one digital location to another including deleting the original copy. After the Asset has been moved, the original copy must be deleted.",
  "odrl:nextPolicy": "To grant the specified Policy to a third party for their use of the Asset. Useful for downstream policies.",
  "odrl:obtainConsent": "To obtain verifiable consent to perform the requested action in relation to the Asset. May be used as a Duty to ensure that the Assigner or a Party is authorized to approve such actions on a case-by-case basis. May link to a Party with the role â€œconsentingPartyâ€ function.",
  "odrl:pay": "The act of paying a financial amount to a party for use of the asset.",
  "odrl:play": "To create a sequential and transient rendition of an Asset. For example, to play a video or audio track. If the action is to be performed to a wider audience than just the Assignees, then the Recipient constraint is recommended to be used.",
  "odrl:present": "To publicly perform the Asset. The asset can be performed (or communicated) in public.",
  "odrl:preview": "The act of providing a short preview of the asset. Use a time constraint with the appropriate action.",
  "odrl:print": "To create a tangible and permanent rendition of an Asset. For example, creating a permanent, fixed (static), and directly perceivable representation of the Asset, such as printing onto paper.",
  "odrl:read": "To obtain data from the Asset. For example, the ability to read a record from a database (the Asset).",
  "odrl:reproduce": "To make duplicate copies the Asset in any material form.",
  "odrl:reviewPolicy": "To review the Policy applicable to the Asset. Used when human intervention is required to review the Policy. May link to an Asset which represents the full Policy information.",
  "odrl:secondaryUse": "The act of using the asset for a purpose other than the purpose it was intended for.",
  "odrl:sell": "To transfer the ownership of the Asset to a third party with compensation and while deleting the original asset.",
  "odrl:stream": "To deliver the Asset in real-time. The Asset maybe utilised in real-time as it is being delivered. If the action is to be performed to a wider audience than just the Assignees, then the Recipient constraint is recommended to be used.",
  "odrl:synchronize": "To use the Asset in timed relations with media (audio/visual) elements of another Asset.",
  "odrl:textToSpeech": "To have a text Asset read out loud. If the action is to be performed to a wider audience than just the Assignees, then the recipient constraint is recommended to be used.",
  "odrl:transfer": "To transfer the ownership of the Asset in perpetuity.",
  "odrl:transform": "To convert the Asset into a different format. Typically used to convert the Asset into a different format for consumption on/transfer to a third party system.",
  "odrl:translate": "To translate the original natural language of an Asset into another natural language. A new derivative Asset is created by that action.",
  "odrl:uninstall": "To unload and delete the computer program Asset from a storage device and disable its readiness for operation. The Asset is no longer accessible to the assignees after it has been used.",
  "odrl:watermark": "To apply a watermark to the Asset.",
  "odrl:write": "The act of writing to the Asset.",
  "odrl:writeTo": "The act of adding data to the Asset.",

Detailed Description of LeftOperands:
  "odrl:absolutePosition": "A point in space or time defined with absolute coordinates for the positioning of the target Asset. Example: The upper left corner of a picture may be constrained to a specific position of the canvas rendering it.",
  "odrl:absoluteSpatialPosition": "The absolute spatial positions of four corners of a rectangle on a 2D-canvas or the eight corners of a cuboid in a 3D-space for the target Asset to fit. Example: The upper left corner of a picture may be constrained to a specific position of the canvas rendering it. Note: see also the Left Operand Relative Spatial Asset Position.",
  "odrl:absoluteTemporalPosition": "The absolute temporal positions in a media stream the target Asset has to fit. Use with Actions including the target Asset in a larger media stream. The fragment part of a Media Fragment URI (https://www.w3.org/TR/media-frags/) may be used for the right operand. See the Left Operand realativeTemporalPosition. <br />Example: The MP3 music file must be positioned between second 192 and 250 of the temporal length of a stream.",
  "odrl:absoluteSize": "Measure(s) of one or two axes for 2D-objects or measure(s) of one to tree axes for 3D-objects of the target Asset. Example: The image can be resized in width to a maximum of 1000px.",
  "odrl:count": "Numeric count of executions of the action of the Rule.",
  "odrl:dateTime": "The date (and optional time and timezone) of exercising the action of the Rule. Right operand value MUST be an xsd:date or xsd:dateTime as defined by [[xmlschema11-2]]. The use of Timezone information is strongly recommended. The Rule may be exercised before (with operator lt/lteq) or after (with operator gt/gteq) the date(time) defined by the Right operand. <br />Example: <code>dateTime gteq 2017-12-31T06:00Z</code> means the Rule can only be exercised after (and including) 6:00AM on the 31st Decemeber 2017 UTC time.",
  "odrl:delayPeriod": "A time delay period prior to exercising the action of the Rule. The point in time triggering this period MAY be defined by another temporal Constraint combined by a Logical Constraint (utilising the odrl:andSequence operand). Right operand value MUST be an xsd:duration as defined by [[xmlschema11-2]]. Only the eq, gt, gteq operators SHOULD be used. <br />Example: <code>delayPeriod eq P60M</code> indicates a delay of 60 Minutes before exercising the action.",
  "odrl:deliveryChannel": "The delivery channel used for exercising the action of the Rule. Example: the asset may be distributed only on mobile networks.",
  "odrl:device": "An identified device used for exercising the action of the Rule. See System Device.",
  "odrl:elapsedTime": "A continuous elapsed time period which may be used for exercising of the action of the Rule. Right operand value MUST be an xsd:duration as defined by [[xmlschema11-2]]. Only the eq, lt, lteq operators SHOULD be used. See also Metered Time. <br />Example: <code>elpasedTime eq P60M</code> indicates a total elapsed time of 60 Minutes.",
  "odrl:event": "An identified event setting a context for exercising the action of the Rule. Events are temporal periods of time, and operators can be used to signal before (lt), during (eq) or after (gt) the event. <br />Example: May be taken during the â€œFIFA World Cup 2020â€ only.",
  "odrl:fileFormat": "A transformed file format of the target Asset. Example: An asset may be transformed into JPEG format.",
  "odrl:industry": "A defined industry sector setting a context for exercising the action of the Rule. Example: publishing or financial industry.",
  "odrl:language": "A natural language used by the target Asset. Example: the asset can only be translated into Greek. Must use [[bcp47]] codes for language values.",
  "odrl:media": "Category of a media asset setting a context for exercising the action of the Rule. Example media types: electronic, print, advertising, marketing. Note: The used type should not be an IANA MediaType as they are focused on technical characteristics.",
  "odrl:meteredTime": "An accumulated amount of one to many metered time periods which were used for exercising the action of the Rule. Right operand value MUST be an xsd:duration as defined by [[xmlschema11-2]]. Only the eq, lt, lteq operators SHOULD be used. See also Elapsed Time. <br />Example: <code>meteredTime lteq P60M</code> indicates an accumulated period of 60 Minutes or less.",
  "odrl:payAmount": "The amount of a financial payment. Right operand value MUST be an xsd:decimal. Can be used for compensation duties with the unit property indicating the currency of the payment.",
  "odrl:percentage": "A percentage amount of the target Asset relevant for exercising the action of the Rule. Right operand value MUST be an xsd:decimal from 0 to 100. Example: Extract less than or equal to 50%.",
  "odrl:product": "Category of product or service setting a context for exercising the action of the Rule. Example: May only be used in the XYZ Magazine.",
  "odrl:purpose": "A defined purpose for exercising the action of the Rule. Example: Educational use.",
  "odrl:recipient": "The party receiving the result/outcome of exercising the action of the Rule. The Right Operand must identify one or more specific Parties or category/ies of the Party.",
  "odrl:relativePosition": "A point in space or time defined with coordinates relative to full measures the positioning of the target Asset. Example: The upper left corner of a picture may be constrained to a specific position of the canvas rendering it.",
  "odrl:relativeSpatialPosition": "The relative spatial positions - expressed as percentages of full values - of four corners of a rectangle on a 2D-canvas or the eight corners of a cuboid in a 3D-space of the target Asset. See also Absolute Spatial Asset Position.",
  "odrl:relativeTemporalPosition": "A point in space or time defined with coordinates relative to full measures the positioning of the target Asset. See also Absolute Temporal Asset Position. <br />Example: The MP3 music file must be positioned between the positions at 33% and 48% of the temporal length of a stream.",
  "odrl:relativeSize": "Measure(s) of one or two axes for 2D-objects or measure(s) of one to tree axes for 3D-objects - expressed as percentages of full values - of the target Asset. Example: The image can be resized in width to a maximum of 200%. Note: See the Left Operand absoluteSize.",
  "odrl:resolution": "Resolution of the rendition of the target Asset. Example: the image may be printed at 1200dpi.",
  "odrl:spatial": "A named and identified geospatial area with defined borders which is used for exercising the action of the Rule. An IRI MUST be used to represent this value. A code value for the area and source of the code must be presented in the Right Operand. <br />Example: the [[iso3166]] Country Codes or the Getty Thesaurus of Geographic Names.",
  "odrl:spatialCoordinates": "A set of coordinates setting the borders of a geospatial area used for exercising the action of the Rule. The coordinates MUST include longitude and latitude, they MAY include altitude and the geodetic datum. The default values are the altitude of earth's surface at this location and the WGS 84 datum.",
  "odrl:system": "An identified computing system used for exercising the action of the Rule. See System Device",
  "odrl:systemDevice": "An identified computing system or computing device used for exercising the action of the Rule. Example: The system device can be identified by a unique code created from the used hardware.",
  "odrl:timeInterval": "A recurring period of time before the next execution of the action of the Rule. Right operand value MUST be an xsd:duration as defined by [[xmlschema11-2]]. Only the eq operator SHOULD be used. <br />Example: <code>timeInterval eq P7D</code> indicates a recurring 7 day period.",
  "odrl:unitOfCount": "The unit of measure used for counting the executions of the action of the Rule. Note: Typically used with Duties to indicate the unit entity to be counted of the Action. <br />Example: A duty to compensate and a unitOfCount constraint of 'perUser' would indicate that the compensation by multiplied by the 'number of users'.",
  "odrl:version": "The version of the target Asset. Example: Single Paperback or Multiple Issues or version 2.0 or higher.",
  "odrl:virtualLocation": "An identified location of the IT communication space which is relevant for exercising the action of the Rule. Example: an Internet domain or IP address range.",
  
 Detailed Description of Operators:
  "odrl:eq": "Indicating that a given value equals the right operand of the Constraint.",
  "odrl:gt": "Indicating that a given value is greater than the right operand of the Constraint.",
  "odrl:gteq": "Indicating that a given value is greater than or equal to the right operand of the Constraint.",
  "odrl:hasPart": "A set-based operator indicating that a given value contains the right operand of the Constraint.",
  "odrl:isA": "A set-based operator indicating that a given value is an instance of the right operand of the Constraint.",
  "odrl:isAllOf": "A set-based operator indicating that a given value is all of the right operand of the Constraint.",
  "odrl:isAnyOf": "A set-based operator indicating that a given value is any of the right operand of the Constraint.",
  "odrl:isNoneOf": "A set-based operator indicating that a given value is none of the right operand of the Constraint.",
  "odrl:isPartOf": "A set-based operator indicating that a given value is contained by the right operand of the Constraint.",
  "odrl:lt": "Indicating that a given value is less than the right operand of the Constraint.",
  "odrl:lteq": "Indicating that a given value is less than or equal to the right operand of the Constraint.",
  "odrl:neq": "Indicating that a given value is not equal to the right operand of the Constraint.",
  "odrl:andSequence": "The relation is satisfied when each of the Constraints are satisfied in the order specified. This property MUST only be used for Logical Constraints, and the list of operand values MUST be Constraint instances. The order of the list MUST be preserved. The andSequence operator is an example where there may be temporal conditional requirements between the operands. This may lead to situations where the outcome is unresolvable, such as deadlock if one of the Constraints is unable to be satisfied. ODRL Processing systems SHOULD plan for these scenarios and implement mechanisms to resolve them.",
  "odrl:or": "The relation is satisfied when at least one of the Constraints is satisfied. This property MUST only be used for Logical Constraints, and the list of operand values MUST be Constraint instances.",
  "odrl:and": "The relation is satisfied when all of the Constraints are satisfied. This property MUST only be used for Logical Constraints, and the list of operand values MUST be Constraint instances.",
  "odrl:xone": "The relation is satisfied when only one, and not more, of the Constaints is satisfied This property MUST only be used for Logical Constraints, and the list of operand values MUST be Constraint instances."


### 9. URI Construction Rules:
**For DRK/Cultural Heritage domain:**
```turtle
drk:policy:<unique_id> (policy URI)
drk:dataset:<name> (dataset URI)
drk:organization:<name> (organization URI)
drk:partner:<name> (partner URI)
drk:connector:<name> (connector URI)
```

**For generic domains:**
```turtle
ex:policy:<unique_id>
ex:asset:<name>
ex:organization:<name>
ex:party:<name>
```

**Important:** Always use the URIs provided in parsed_data if available. If not, construct appropriate URIs based on the domain.

### 10. Human-Readable Metadata (ALWAYS include):
```turtle
dct:title "Short policy title"@en ;
dct:description "Clear explanation of what this policy does - who can do what with which resource under what conditions"@en ;
```

**Title guidelines:**
- Short (5-10 words)
- Descriptive
- Example: "Research Access to Medieval Manuscripts"

**Description guidelines:**
- Complete sentence(s)
- Explain: WHO + ACTION + WHAT + CONDITIONS
- Example: "UC4 Partner may use the Medieval Manuscripts Collection dataset for research purposes up to 30 times per month, and has unlimited access for archival backup purposes."

### 11. Complete Example (DRK domain):
```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix drk: <http://w3id.org/drk/ontology/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

drk:policy:abc123 a odrl:Policy, odrl:Offer ;
    odrl:uid drk:policy:abc123 ;
    dct:title "Research Access to Medieval Manuscripts"@en ;
    dct:description "UC4 Partner may use the Medieval Manuscripts Collection for research purposes"@en ;
    dct:creator drk:organization:daten_raumkultur ;
    dct:created "2025-01-16T00:00:00Z"^^xsd:dateTime ;
    odrl:permission [
        a odrl:Permission ;
        odrl:action odrl:use ;
        odrl:target drk:dataset:medieval_mss_2024 ;
        odrl:assigner drk:organization:daten_raumkultur ;
        odrl:assignee drk:partner:uc4 ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:purpose ;
            odrl:operator odrl:eq ;
            odrl:rightOperand "research" ;
            rdfs:comment "Limited to research purposes only"@en ;
        ] ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:count ;
            odrl:operator odrl:lteq ;
            odrl:rightOperand "30"^^xsd:integer ;
            rdfs:comment "Maximum 30 uses per month"@en ;
        ] ;
    ] .
```

## OUTPUT REQUIREMENTS:

1. **Return ONLY valid Turtle syntax**
2. **NO markdown code blocks** (no ```)
3. **NO explanatory text**
4. **Start directly with @prefix declarations**
5. **Include human-readable title and description**
6. **Use appropriate domain prefixes** (drk: or ex:)
7. **Add rdfs:comment to complex constraints** for clarity

Use the provided DCT_CREATED_VALUE for the dct:created value.

Generate the policy now.
"""

REGENERATION_PROMPT = """You are an ODRL expert fixing SHACL validation errors in Turtle format.

## YOUR GOAL: Fix technical SHACL violations while preserving policy intent

## CRITICAL RULES FOR FIXING:

1. **PRESERVE policy meaning** - Do not change what the policy allows/prohibits
2. **FIX ONLY technical issues** - Syntax, URIs, operators, structure
3. **KEEP all semantic content** - Actions, constraints, parties, targets
4. **MAINTAIN human-readable metadata** - Keep dct:title and dct:description
5. **Use provided DCT_CREATED_VALUE** for dct:created

## COMMON SHACL FIXES:

### Missing odrl:uid:
```turtle
<policy_uri> a odrl:Policy, odrl:Set ;
    odrl:uid <policy_uri> ;  ← ADD THIS (must match policy URI)
```

### Wrong Operator Format:
**Incorrect:**
```turtle
odrl:operator "lte" .  ← Missing odrl: prefix
odrl:operator lteq .   ← Missing odrl: prefix
```
**Correct:**
```turtle
odrl:operator odrl:lteq .
odrl:operator odrl:eq .
odrl:operator odrl:gteq .
```

### Missing odrl: Prefix in leftOperand:
**Incorrect:**
```turtle
odrl:leftOperand "dateTime" .
odrl:leftOperand count .
```
**Correct:**
```turtle
odrl:leftOperand odrl:dateTime .
odrl:leftOperand odrl:count .
```

### Missing Constraint Type Declaration:
```turtle
odrl:constraint [
    a odrl:Constraint ;  ← ADD THIS
    odrl:leftOperand odrl:dateTime ;
    odrl:operator odrl:lteq ;
    odrl:rightOperand "2025-12-31"^^xsd:date ;
] .
```

### Wrong Datatype:
**Incorrect:**
```turtle
odrl:rightOperand "2025-12-31" .  ← Missing ^^xsd:date
odrl:rightOperand "30" .          ← Missing ^^xsd:integer
```
**Correct:**
```turtle
odrl:rightOperand "2025-12-31"^^xsd:date .
odrl:rightOperand "30"^^xsd:integer .
```

### Missing Permission/Prohibition Type:
```turtle
odrl:permission [
    a odrl:Permission ;  ← ADD THIS
    odrl:action odrl:read ;
    ...
] .
```

## VALIDATION ERROR INTERPRETATION:

When you see SHACL errors like:
- "Missing odrl:uid" → Add `odrl:uid <same_as_policy_uri>` to policy
- "Invalid operator" → Check operators list, add odrl: prefix
- "Missing constraint type" → Add `a odrl:Constraint` to constraint
- "Wrong datatype" → Add appropriate ^^xsd:type
- "Missing property" → Add required ODRL property

## PRESERVE FROM ORIGINAL:

All permissions, prohibitions, duties
All actions (odrl:read, odrl:use, etc.)
All constraint values and semantic meaning
All parties (assignee, assigner)
All targets (assets)
Policy title and description
Domain-specific prefixes (drk:, ex:, etc.)
Complete policy intent from user's request

## OUTPUT REQUIREMENTS:

1. Return ONLY the corrected Turtle
2. No markdown code blocks
3. No explanations
4. No comments outside the Turtle syntax
5. Start with @prefix declarations

Fix the policy now.
"""

class Generator:
    """
    Universal ODRL Generator Agent
    Generates domain-agnostic ODRL policies with proper metadata
    """
    
    def __init__(self, model=None, temperature=0.0, custom_config=None):
        self.model = model
        self.temperature = temperature if temperature is not None else 0.0
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=self.temperature,
            custom_config=custom_config
        )
    
    def generate(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None,
        validation_errors: Optional[Dict[str, Any]] = None,
        previous_odrl: Optional[str] = None,
        attempt_number: int = 1
    ) -> Dict[str, Any]:
        """
        Generate or regenerate ODRL policy in Turtle format
        
        Args:
            parsed_data: Parser output (required)
            original_text: User's input (required)
            reasoning: Reasoner analysis (optional)
            validation_errors: SHACL issues to fix (optional, for regeneration)
            previous_odrl: Previously generated Turtle (optional, for regeneration)
            attempt_number: Generation attempt number (1, 2, 3...)
            
        Returns:
            Dict with 'odrl_turtle' key containing Turtle string
        """
        
        logger.info(f"[Generator] Starting generation attempt #{attempt_number}")
        logger.info(f"[Generator] Original text: {original_text[:50]}...")
        logger.info(f"[Generator] Policies to generate: {parsed_data.get('total_policies', 0)}")
        
        if reasoning:
            logger.info(f"[Generator] Has reasoning: decision={reasoning.get('decision')}")
        
        # Decide: fresh generation or regeneration
        if validation_errors and previous_odrl:
            logger.info(f"[Generator]  REGENERATION MODE")
            logger.info(f"[Generator] Fixing {len(validation_errors.get('issues', []))} SHACL violations")
            odrl_turtle = self._regenerate_with_fixes(
                parsed_data,
                original_text,
                validation_errors,
                previous_odrl,
                attempt_number
            )
        else:
            logger.info(f"[Generator]  FRESH GENERATION")
            odrl_turtle = self._generate_fresh(parsed_data, original_text, reasoning)
        
        logger.info(f"[Generator] Generation complete")
        logger.info(f"[Generator] Turtle length: {len(odrl_turtle)} chars")
        
        return {
            'odrl_turtle': odrl_turtle,
            'format': 'turtle',
            'attempt_number': attempt_number
        }
    
    def _generate_fresh(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate fresh ODRL policy in Turtle format"""
        
        try:
            # Generate unique policy ID
            policy_id_suffix = uuid.uuid4().hex[:8]
            
            # Detect domain from parsed data
            domain_prefix = self._detect_domain_prefix(parsed_data, original_text)
            
            if domain_prefix == "drk":
                policy_uri = f"http://w3id.org/drk/ontology/policy:{policy_id_suffix}"
            else:
                policy_uri = f"http://example.com/policy:{policy_id_suffix}"
            
            logger.info(f"[Generator] Policy URI: {policy_uri}")
            logger.info(f"[Generator] Domain prefix: {domain_prefix}")
            
            current_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            dct_created_value = self._extract_created_value(parsed_data) or current_time
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", FRESH_GENERATION_PROMPT),
                ("human", """Generate a complete ODRL policy in Turtle format.

POLICY URI: {policy_uri}

DCT_CREATED_VALUE (use for dct:created):
{dct_created_value}

ORIGINAL USER REQUEST:
{original_text}

PARSED DATA:
{parsed_data}

IMPORTANT:
1. Use appropriate domain prefix (drk: for cultural heritage/data spaces, ex: otherwise)
2. Include dct:title and dct:description for human readability
3. Add rdfs:comment to complex constraints
4. Return ONLY valid Turtle (no markdown, no explanations)
5. Start with @prefix declarations""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "policy_uri": policy_uri,
                "dct_created_value": dct_created_value,
                "original_text": original_text,
                "parsed_data": str(parsed_data)
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] Fresh generation complete")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in fresh generation: {e}")
            raise
    
    def _regenerate_with_fixes(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        validation_errors: Dict[str, Any],
        previous_odrl: str,
        attempt_number: int
    ) -> str:
        """Regenerate ODRL Turtle by fixing SHACL validation errors"""
        
        try:
            # Extract issues with full details
            issues = validation_errors.get('issues', [])
            
            # Build detailed issue description
            issues_text = "\n".join([
                f"""Issue {i+1}: {issue.get('type', 'Unknown')}
  - Field: {issue.get('field', 'unknown')}
  - Problem: {issue.get('message', 'No message')}
  - Current Value: {issue.get('actual_value', 'N/A')}
  - Focus Node: {issue.get('focus_node', 'N/A')}
  - Severity: {issue.get('severity', 'Error')}"""
                for i, issue in enumerate(issues)
            ])
            
            logger.info(f"[Generator] SHACL issues to fix:")
            for line in issues_text.split('\n'):
                logger.info(f"[Generator]   {line}")
            
            current_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            dct_created_value = self._extract_created_value(parsed_data) or current_time
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", REGENERATION_PROMPT),
                ("human", """Fix the SHACL validation errors while preserving the original policy intent.

ORIGINAL USER REQUEST:
{original_text}

DCT_CREATED_VALUE (use for dct:created):
{dct_created_value}

PARSED POLICY STRUCTURE:
{parsed_data}

CURRENT TURTLE (with SHACL violations):
{previous_odrl}

SHACL VALIDATION ERRORS TO FIX:
{validation_errors}

INSTRUCTIONS:
1. Read the original user request to understand the intended policy
2. Look at the current Turtle to see what was generated
3. Fix ONLY the specific SHACL violations listed above
4. Ensure the fixed policy still matches the user's original intent
5. Preserve all metadata (dct:title, dct:description, rdfs:comment)
6. Return ONLY the corrected Turtle (no markdown, no explanations)""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "original_text": original_text,
                "dct_created_value": dct_created_value,
                "parsed_data": str(parsed_data),
                "previous_odrl": previous_odrl,
                "validation_errors": issues_text
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] Regeneration complete (attempt #{attempt_number})")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in regeneration: {e}")
            raise
    
    def _detect_domain_prefix(self, parsed_data: Dict[str, Any], original_text: str) -> str:
        """Detect appropriate domain prefix from data"""
        
        # Check for DRK indicators
        drk_indicators = [
            'drk:',
            'daten raumkultur',
            'datenraumkultur',
            'w3id.org/drk',
            'cultural heritage',
            'data space'
        ]
        
        combined_text = f"{str(parsed_data)} {original_text}".lower()
        
        for indicator in drk_indicators:
            if indicator.lower() in combined_text:
                return "drk"
        
        return "ex"
    
    def _clean_turtle(self, turtle_str: str) -> str:
        """Remove markdown code blocks and extra whitespace"""
        # Remove markdown code blocks
        turtle_str = turtle_str.replace('```turtle', '').replace('```', '')
        
        # Remove leading/trailing whitespace
        turtle_str = turtle_str.strip()
        
        return turtle_str

    def _extract_created_value(self, parsed_data: Dict[str, Any]) -> Optional[str]:
        """Extract timestamp for dct:created from parsed data if provided."""
        if not isinstance(parsed_data, dict):
            return None

        key_names = {"dct:created", "dct_created", "dctCreated", "created", "timestamp"}

        def _normalize(value: Any) -> Optional[str]:
            if isinstance(value, str):
                return value.strip() or None
            if isinstance(value, dict):
                for candidate_key in ("value", "literal", "dateTime", "datetime", "created", "timestamp"):
                    candidate = value.get(candidate_key)
                    if isinstance(candidate, str) and candidate.strip():
                        return candidate.strip()
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, str) and item.strip():
                        return item.strip()
            return None

        def _search(obj: Any) -> Optional[str]:
            if isinstance(obj, dict):
                if "metadata" in obj and isinstance(obj["metadata"], dict):
                    metadata_timestamp = obj["metadata"].get("timestamp")
                    normalized = _normalize(metadata_timestamp)
                    if normalized:
                        return normalized
                for key, val in obj.items():
                    if key in key_names:
                        normalized = _normalize(val)
                        if normalized:
                            return normalized
                    found = _search(val)
                    if found:
                        return found
            elif isinstance(obj, list):
                for item in obj:
                    found = _search(item)
                    if found:
                        return found
            return None

        return _search(parsed_data)
