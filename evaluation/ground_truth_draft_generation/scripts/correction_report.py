from scripts.util import initialize_language_model, setup_llm_chain, save_odrl_to_text, set_openai_api_key
from langchain_core.prompts import PromptTemplate

try:
    set_openai_api_key()
except ValueError:
    # Allow callers to inject keys later (e.g., via CLI/runtime config).
    pass

# Agreement Validation Report
# ODRL Policy Validation Criteria
# ODRL Policy Compliance Guidelines
# all rules to correct an Agreement ODRLKG
AGREEMENT_CORRECTION_REPORT = """
rule_1= A Policy MUST have one 'odrl:uid' property value of type IRI to identify the Policy, if odrl:uid is missed use 
             odrl:uid <UI> ;
             where "UI" is a placeholder, fill the an appropriate name of policy from policy description.
        

rule_2 = A Policy MUST have one 'odrl:profile' property value of type IRI to identify the Policy.
                        if odrl:profile is missed create 'odrl:profile' with an appropriate name from policy description.
         

rule_3 = The generated ODRL policy MUST hav the following mandatory meta-information properties: dc:creator, dc:title, dc:description, and dc:issued. If any of these properties is not explicitly defined in policy, add them to policy with an appropriate name from policy description with the following values:
                dc:creator "Policy Owner"^^xsd:string;
                dc:title "Agreement title"^^xsd:string;
                dc:description "Agreement description"^^xsd:string;
                dc:issued "Current DateTime"^^xsd:dateTime.

                where "Policy Owner" is a placeholder, fill the name of policy owner from policy description.
                      "Agreement title" is a placeholder, fill the title of policy from policy description.
                      "description" is a placeholder, fill the description of policy from policy description.
                      "Current DateTime" is a placeholder, fill the Current DateTime.

rule_4 = Permission MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declare One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                                                             

rule_5 = Permission MUST have one 'odrl:assignee' of type Party who receive the policy if it is not explicitly defined. do the following steps:
            step1: Declare One 'odrl:assignee' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assignee" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assignee", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                                                             
                
rule_6 =  Permission MUST have one 'target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_7 =  for 'odrl:action' Property in 'odrl:permission' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_8 =  'odrl:duty' MAY have none or one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_9 =  'odrl:prohibition' MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                               
         

rule_10 =  'odrl:prohibition' MUST have one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
       

rule_11 = for 'odrl:action' Property in 'odrl:prohibition' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_12 =  do not define odrl:operator, odrl:rightOperand and odrl:rightOperand outside 'odrl:constrint' block. if it has been defined please relocate them in to 'odrl:constraint' block.
                    as below:
                    example:
                         odrl:constraint[
                                        a odrl:Constraint;
                                        odrl:leftOperand "leftOperandPropertyValue";
                                        odrl:operator "OperatorProperty";
                                        odrl:rightOperand "rightOperandValue"^^xsd:dataType
                                    ]
                    where:
                    "leftOperandPropertyValue" is a placeholders, fill it with an appropriate value based on constraint as described in policy description.
                    "OperatorProperty" is a placeholders, fill it with an appropriate value based on operator as described in policy description.
                    "rightOperandValue" is a placeholders, fill it with an appropriate value based on policy description.                    
         
rule_13 =  for leftOperand property value. 
              If the specified value is not one of the predefined LeftOperand instances (odrl:absolutePosition, odrl:absoluteSpatialPosition, odrl:absoluteTemporalPosition, odrl:absoluteSize, odrl:count, odrl:dateTime, odrl:delayPeriod, odrl:deliveryChannel, odrl:elapsedTime, odrl:event, odrl:fileFormat, odrl:industry, odrl:language, odrl:media, odrl:meteredTime, odrl:payAmount, odrl:percentage, odrl:product, odrl:purpose, odrl:recipient, odrl:relativePosition, odrl:relativeSpatialPosition, odrl:relativeTemporalPosition, odrl:relativeSize, odrl:resolution, odrl:spatial, odrl:spatialCoordinates, odrl:systemDevice, odrl:timeInterval, odrl:unitOfCount, odrl:version, odrl:virtualLocation). 
              check the policy description and choose the most appropriate predefined LeftOperand based on the context. refine the 'dorl:leftOperand' value.

rule_14 = 'odrl:constraint' MUST have one 'odrl:uid' property value of type IRI:
                        if  'odrl:uid' is missed add
                          odrl:uid <UI>; 
                where "UI" is placeholders, fill it with an appropriate value based on the odrl:constraint.
         

rule_15 =  'odrl:operator' property in the constraint must be one of the predefined values( odrl:eq, odrl:gt, odrl:gteq, odrl:lt, odrl:lteq, odrl:neq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf) If the specified value is  is not one of the predefined operators refine the operator based on the policy description context. 
rule_16 =  'odrl:constraint' MUST have one  odrl:dataType property specifying the data type of the rightOperand. if it is missed add to policy.
rule_17 = Ensure that the 'odrl:rightOperand' property in the ODRL policy includes a data type for its value. 
"""

                    
# Combine all rules together to correct an offer KG
OFFER_CORRECTION_REPORT = """
rule_1= A Policy MUST have one 'odrl:uid' property value of type IRI to identify the Policy, if odrl:uid is missed use 
             odrl:uid <UI> ;
             where "UI" is a placeholder, fill the an appropriate name of policy from policy description.
        

rule_2 = A Policy MUST have one 'odrl:profile' property value of type IRI to identify the Policy.
                        if odrl:profile is missed create 'odrl:profile' with an appropriate name from policy description.
         

rule_3 = The generated ODRL policy MUST hav the following mandatory meta-information properties: dc:creator, dc:title, dc:description, and dc:issued. If any of these properties is not explicitly defined in policy, add them to policy with an appropriate name from policy description with the following values:
                dc:creator "Policy Owner"^^xsd:string;
                dc:title "Agreement title"^^xsd:string;
                dc:description "Agreement description"^^xsd:string;
                dc:issued "Current DateTime"^^xsd:dateTime.

                where "Policy Owner" is a placeholder, fill the name of policy owner from policy description.
                      "Agreement title" is a placeholder, fill the title of policy from policy description.
                      "description" is a placeholder, fill the description of policy from policy description.
                      "Current DateTime" is a placeholder, fill the Current DateTime.

rule_4 = Permission MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declare One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                                                             
         
rule_5 =  Permission MUST have one 'target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_6 =  for 'odrl:action' Property in 'odrl:permission' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_7 =  'odrl:duty' MAY have none or one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_8 =  'odrl:prohibition' MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                               
         

rule_9 =  'odrl:prohibition' MUST have one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
       

rule_10 = for 'odrl:action' Property in 'odrl:prohibition' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_11 =  do not define odrl:operator, odrl:rightOperand and odrl:rightOperand outside 'odrl:constrint' block. if it has been defined please relocate them in to 'odrl:constraint' block.
                    as below:
                    example:
                         odrl:constraint[
                                        a odrl:Constraint;
                                        odrl:leftOperand "leftOperandPropertyValue";
                                        odrl:operator "OperatorProperty";
                                        odrl:rightOperand "rightOperandValue"^^xsd:dataType
                                    ]
                    where:
                    "leftOperandPropertyValue" is a placeholders, fill it with an appropriate value based on constraint as described in policy description.
                    "OperatorProperty" is a placeholders, fill it with an appropriate value based on operator as described in policy description.
                    "rightOperandValue" is a placeholders, fill it with an appropriate value based on policy description.                    
         
rule_12 =  for leftOperand property value. 
              If the specified value is not one of the predefined LeftOperand instances (odrl:absolutePosition, odrl:absoluteSpatialPosition, odrl:absoluteTemporalPosition, odrl:absoluteSize, odrl:count, odrl:dateTime, odrl:delayPeriod, odrl:deliveryChannel, odrl:elapsedTime, odrl:event, odrl:fileFormat, odrl:industry, odrl:language, odrl:media, odrl:meteredTime, odrl:payAmount, odrl:percentage, odrl:product, odrl:purpose, odrl:recipient, odrl:relativePosition, odrl:relativeSpatialPosition, odrl:relativeTemporalPosition, odrl:relativeSize, odrl:resolution, odrl:spatial, odrl:spatialCoordinates, odrl:systemDevice, odrl:timeInterval, odrl:unitOfCount, odrl:version, odrl:virtualLocation). 
              check the policy description and choose the most appropriate predefined LeftOperand based on the context. refine the 'dorl:leftOperand' value.

rule_13 = 'odrl:constraint' MUST have one 'odrl:uid' property value of type IRI:
                        if  'odrl:uid' is missed add
                          odrl:uid <UI>; 
                where "UI" is placeholders, fill it with an appropriate value based on the odrl:constraint.
         

rule_14 =  'odrl:operator' property in the constraint must be one of the predefined values( odrl:eq, odrl:gt, odrl:gteq, odrl:lt, odrl:lteq, odrl:neq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf) If the specified value is  is not one of the predefined operators refine the operator based on the policy description context. 
rule_15 =  'odrl:constraint' MUST have one  odrl:dataType property specifying the data type of the rightOperand. if it is missed add to policy.
rule_16 = Ensure that the 'odrl:rightOperand' property in the ODRL policy includes a data type for its value. 
"""

                    
# Combine all rules together to correct an offer KG
SET_CORRECTION_REPORT = """
rule_1= A Rule MUST have one 'odrl:uid' property value of type IRI to identify the Policy, if odrl:uid is missed use 
             odrl:uid <UI> ;
             where "UI" is a placeholder, fill the an appropriate name of policy from policy description.
        

rule_2 = A Rule MUST have one 'odrl:profile' property value of type IRI to identify the Policy.
                        if odrl:profile is missed create 'odrl:profile' with an appropriate name from policy description.
         

rule_3 = The ODRL Rule MUST hav the following mandatory meta-information properties: dc:creator, dc:title, dc:description, and dc:issued. If any of these properties is not explicitly defined in policy, add them to policy with an appropriate name from policy description with the following values:
                dc:creator "Policy Owner"^^xsd:string;
                dc:title "Agreement title"^^xsd:string;
                dc:description "Agreement description"^^xsd:string;
                dc:issued "Current DateTime"^^xsd:dateTime.

                where "Policy Owner" is a placeholder, fill the name of policy owner from policy description.
                      "Agreement title" is a placeholder, fill the title of policy from policy description.
                      "description" is a placeholder, fill the description of policy from policy description.
                      "Current DateTime" is a placeholder, fill the Current DateTime.

rule_4 = Permission MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declare One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                                                             
         
rule_5 =  Permission MUST have one 'target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_6 =  for 'odrl:action' Property in 'odrl:permission' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_7 =  'odrl:duty' MAY have none or one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

rule_8 =  'odrl:prohibition' MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:assigner' property value of odrl:Party class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Party.
            step3: generate 'dc:description' of type String to describe a party from policy description. 
            step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy assigner" a odrl:Party;
                        odrl:uid <UI>;
                        dc:description "AsignerDescription"^^xsd:string;
        
            where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                               
         

rule_9 =  'odrl:prohibition' MUST have one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
            step1: Declar One 'odrl:target' property value of odrl:Asset class.
            step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
            step3: generate 'dc:description' of type String, describe Asset from policy description. 
            step4: reference the generated 'odrl:target' in side 'odrl:permission'.

            below is an example of how the generated output should look like. 
            example:
                    drkodrl:"Policy Asset" a odrl:Asset;
                        odrl:uid <UI>;
                        dc:description "AssetDescription"^^xsd:string;
        
            where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
       

rule_10 = for 'odrl:action' Property in 'odrl:prohibition' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
            [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
            If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
                                action [
                                    a odrl:Action ;
                                    "your_custom_actionName"^^xsd:string;
                                ] ;
            
            where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
rule_11 =  do not define odrl:operator, odrl:rightOperand and odrl:rightOperand outside 'odrl:constrint' block. if it has been defined please relocate them in to 'odrl:constraint' block.
                    as below:
                    example:
                         odrl:constraint[
                                        a odrl:Constraint;
                                        odrl:leftOperand "leftOperandPropertyValue";
                                        odrl:operator "OperatorProperty";
                                        odrl:rightOperand "rightOperandValue"^^xsd:dataType
                                    ]
                    where:
                    "leftOperandPropertyValue" is a placeholders, fill it with an appropriate value based on constraint as described in policy description.
                    "OperatorProperty" is a placeholders, fill it with an appropriate value based on operator as described in policy description.
                    "rightOperandValue" is a placeholders, fill it with an appropriate value based on policy description.                    
         
rule_12 =  for leftOperand property value. 
              If the specified value is not one of the predefined LeftOperand instances (odrl:absolutePosition, odrl:absoluteSpatialPosition, odrl:absoluteTemporalPosition, odrl:absoluteSize, odrl:count, odrl:dateTime, odrl:delayPeriod, odrl:deliveryChannel, odrl:elapsedTime, odrl:event, odrl:fileFormat, odrl:industry, odrl:language, odrl:media, odrl:meteredTime, odrl:payAmount, odrl:percentage, odrl:product, odrl:purpose, odrl:recipient, odrl:relativePosition, odrl:relativeSpatialPosition, odrl:relativeTemporalPosition, odrl:relativeSize, odrl:resolution, odrl:spatial, odrl:spatialCoordinates, odrl:systemDevice, odrl:timeInterval, odrl:unitOfCount, odrl:version, odrl:virtualLocation). 
              check the policy description and choose the most appropriate predefined LeftOperand based on the context. refine the 'dorl:leftOperand' value.

rule_13 = 'odrl:constraint' MUST have one 'odrl:uid' property value of type IRI:
                        if  'odrl:uid' is missed add
                          odrl:uid <UI>; 
                where "UI" is placeholders, fill it with an appropriate value based on the odrl:constraint.
rule_14 =  'odrl:operator' property in the constraint must be one of the predefined values( odrl:eq, odrl:gt, odrl:gteq, odrl:lt, odrl:lteq, odrl:neq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf) If the specified value is  is not one of the predefined operators refine the operator based on the policy description context. 
rule_15 =  'odrl:constraint' MUST have one  odrl:dataType property specifying the data type of the rightOperand. if it is missed add to policy.
rule_16 = Ensure that the 'odrl:rightOperand' property in the ODRL policy includes a data type for its value. 
"""


def setup_agreement_validato_prompt_template(policy_description, odrl_generated,  correction_report):
    return  PromptTemplate(template=""" for policy description "{policy_description}"
                           \n an ODRL policy {odrl_generated} has been generated. compare the generated policy with the validation report {correction_report}.
                                                If it is not valid, please refine the policy.
                                                \nGive output in well-formatted TTL.""",
                                                input_variables=["policy_description", "odrl_generated", "correction_report"])

def odrl_corrector(
    policy_description,
    odrl_generated,
    correction_report,
    LLMmodel,
    openai_api_base=None,
    openai_api_key=None,
    temperature=0.7,
):
    # gpt-3.5-turbo
    # Initialize the language model
    llm = initialize_language_model(
        LLMmodel,
        temperature=temperature,
        openai_api_base=openai_api_base,
        openai_api_key=openai_api_key,
    )
    prompt_template = setup_agreement_validato_prompt_template(policy_description, odrl_generated, correction_report)
    
    chain = setup_llm_chain(llm, prompt_template)
    res = chain.run({"policy_description":policy_description, "odrl_generated": odrl_generated, "correction_report":correction_report})
    # print(res)
    return res




# # # Rule Validation Report
# RULE_VALIDATION_REPORT = """ Compare the generated policy incrementally with the following constraints:

#                     1. A Policy MUST have one 'odrl:uid' property value of type IRI ^^xsd:anyURI to identify the Policy.
#                        if it is missed use this odrl:uid "urn:uuid:PrintNameOfAgreement"^^xsd:anyURI;
#                        dont use @prefix ex: <http://example.com/> . in policy use @prefix drkodrl: <https://w3id.org/drkodrl> . as deafault.

#                     2. Ensure that the generated ODRL policy includes the following mandatory meta-information properties: dc:creator, dc:title, dc:description, and dc:issued. If any of these properties is not explicitly defined in the generated policy, add them to policy with the following values:
#                         dc:creator "PrintPolicyOwner"^^xsd:string;
#                         dc:title "Print Agreement title"^^xsd:string;
#                         dc:description "Print Agreement description"^^xsd:string;
#                         dc:issued "PrintCurrentDateTime"^^xsd:dateTime.
#                     3. A Policy MUST have one 'odrl:profile' property value of type IRI ^^xsd:anyURI to identify the Policy.
#                         if it is missed use this odrl:profile "urn:uuid:asigne a number for profile here"^^xsd:anyURI;

#                     4. Permission MUST have:
#                        - One 'assigner' property value of odrl:Party class 
#                        - AND One 'assignee' property value of odrl:Party class.
#                         If the type of 'assigner' or 'assignee' is not explicitly defined use odrl:Party class
#                         Define 'assigner' property value of type odrl:Party
#                                 odrl:assigner [
#                                     a odrl:Party;
#                                     odrl:uid "urn:uuid:PrintPartyName"^^xsd:anyURI;
#                                     dc:description "Description of the Party."^^xsd:string
#                                 ].
#                         Define 'assignee' property value of type odrl:Party
#                                 odrl:assignee [
#                                     a odrl:Party; 
#                                     odrl:uid "urn:uuid:PrintPartyName"^^xsd:anyURI; 
#                                     dc:description "Description of the Party."^^xsd:string
#                                 ].

#                      - Permission MUST have one 'target' property value of type Asset. If 'target' Type has not been explicitly defined, use odrl:Asset, Take asset from policy description add as follow:
#                                 odrl:target [
#                                     a odrl:Asset; 
#                                     odrl:uid "urn:uuid:PrintAssetNameofpolicydescription"^^xsd:anyURI; 
#                                     dc:description "Description of the Asset."^^xsd:string
#                                 ].
#                         - for action Property in Permission MUST have property value within standardized values include: [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
#                         If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
#                                 action [
#                                     a odrl:Action ;
#                                     "your_custom_actionName"^^xsd:string;
#                                 ] ;

#                     5. A Prohabition MUST have:
#                         - One 'assigner' property value of odrl:Party class.
#                         - One 'assignee' property value of odrl:Party class.
#                         - One 'target'property value of odrl:Party class. 
#                         - one 'action' property value of odrl:Action class.
            
#                     7. Duty MAY have optional 'assigner' and/or 'assignee' property values of type Party.

#                     8. Policy Constraint: MUST have one 'odrl:uid' property value of type IRI ^^xsd:anyURI
#                         if  'odrl:uid' is missed add odrl:uid "urn:uuid:PrintNameOfConstraint"^^xsd:anyURI; 
#                     9. Policy Constraint: MUST have one  odrl:dataType property specifying the data type of the rightOperand.if it is missed add to refinement policy.
#                     10. Ensure that the rightOperand property in the ODRL policy includes a data type for its value. 
#                     11. Policy Constraint may have none or one unit property value of type ^^xsd:anyUR , setting the unit used for the value of the rightOperand if it is missed add to refinement.
#                     12. for leftOperand property value. If the specified value is not one of the predefined LeftOperand instances (odrl:absolutePosition, odrl:absoluteSpatialPosition, odrl:absoluteTemporalPosition, odrl:absoluteSize, odrl:count, odrl:dateTime, odrl:delayPeriod, odrl:deliveryChannel, odrl:elapsedTime, odrl:event, odrl:fileFormat, odrl:industry, odrl:language, odrl:media, odrl:meteredTime, odrl:payAmount, odrl:percentage, odrl:product, odrl:purpose, odrl:recipient, odrl:relativePosition, odrl:relativeSpatialPosition, odrl:relativeTemporalPosition, odrl:relativeSize, odrl:resolution, odrl:spatial, odrl:spatialCoordinates, odrl:systemDevice, odrl:timeInterval, odrl:unitOfCount, odrl:version, odrl:virtualLocation). check the policy description and choose the most appropriate predefined LeftOperand based on the context. refine the leftOperand value.
#                     13. operator property in the constraint must be one of the predefined values( odrl:eq, odrl:gt, odrl:gteq, odrl:lt, odrl:lteq, odrl:neq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf) If the specified value is  is not one of the predefined operators refine the operator based on the policy description context. 
#                    """

# def setup_rule_validato_prompt_template(odrl, odrl_generated,  validationReport):
#     return  PromptTemplate(template=""" for policy description "{odrl}"
#                            \n and ODRL policy {odrl_generated} has been generated. compare the generated policy with the validation report {validationReport}.
#                                                 If it is not valid, please refine the policy.
#                                                 \nGive output in well-formatted TTL.""",
#                                                 input_variables=["odrl_generated", "odrl", "validationReport"])

# def odrl_rule_validator(odrl, odrl_generated, validationReport):
#     # gpt-3.5-turbo
#     # Initialize the language model
#     llm = initialize_language_model()
#     prompt_template = setup_rule_validato_prompt_template(odrl, odrl_generated, validationReport)
    
#     chain = setup_llm_chain(llm, prompt_template)
#     res = chain.run({"odrl":odrl, "odrl_generated": odrl_generated, "validationReport":validationReport})
#     # print(res)
#     return res



# all_rules = """
# rule_1= A Policy MUST have one 'odrl:uid' property value of type IRI to identify the Policy, if odrl:uid is missed use 
#              odrl:uid <urn:uuid:NameOfAgreement> ;
#              where "NameOfAgreement" is a placeholder, fill the an appropriate name of policy from policy description.
        

# rule_2 = A Policy MUST have one 'odrl:profile' property value of type IRI to identify the Policy.
#                         if odrl:profile is missed create 'odrl:profile' with an appropriate name from policy description.
         

# rule_3 = The generated ODRL policy MUST hav the following mandatory meta-information properties: dc:creator, dc:title, dc:description, and dc:issued. If any of these properties is not explicitly defined in policy, add them to policy with an appropriate name from policy description with the following values:
#                 dc:creator "Policy Owner"^^xsd:string;
#                 dc:title "Agreement title"^^xsd:string;
#                 dc:description "Agreement description"^^xsd:string;
#                 dc:issued "Current DateTime"^^xsd:dateTime.

#                 where "Policy Owner" is a placeholder, fill the name of policy owner from policy description.
#                       "Agreement title" is a placeholder, fill the title of policy from policy description.
#                       "description" is a placeholder, fill the description of policy from policy description.
#                       "Current DateTime" is a placeholder, fill the Current DateTime.

# rule_4 = Permission MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
#             step1: Declare One 'odrl:assigner' property value of odrl:Party class.
#             step2: generate 'odrl:uid' property value of type IRI to identify the Party.
#             step3: generate 'dc:description' of type String to describe a party from policy description. 
#             step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

#             below is an example of how the generated output should look like. 
#             example:
#                     drkodrl:"Policy assigner" a odrl:Party;
#                         odrl:uid "UI"^^xsd:anyURI;
#                         dc:description "AsignerDescription"^^xsd:string;
        
#             where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                                                             
         
# rule_5 =  Permission MUST have one 'target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
#             step1: Declar One 'odrl:target' property value of odrl:Asset class.
#             step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
#             step3: generate 'dc:description' of type String, describe Asset from policy description. 
#             step4: reference the generated 'odrl:target' in side 'odrl:permission'.

#             below is an example of how the generated output should look like. 
#             example:
#                     drkodrl:"Policy Asset" a odrl:Asset;
#                         odrl:uid "UI"^^xsd:anyURI;
#                         dc:description "AssetDescription"^^xsd:string;
        
#             where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

# rule_6 =  for 'odrl:action' Property in 'odrl:permission' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
#             [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
#             If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
#                                 action [
#                                     a odrl:Action ;
#                                     "your_custom_actionName"^^xsd:string;
#                                 ] ;
            
#             where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
# rule_7 =  'odrl:duty' MAY have none or one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
#             step1: Declar One 'odrl:target' property value of odrl:Asset class.
#             step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
#             step3: generate 'dc:description' of type String, describe Asset from policy description. 
#             step4: reference the generated 'odrl:target' in side 'odrl:permission'.

#             below is an example of how the generated output should look like. 
#             example:
#                     drkodrl:"Policy Asset" a odrl:Asset;
#                         odrl:uid "UI"^^xsd:anyURI;
#                         dc:description "AssetDescription"^^xsd:string;
        
#             where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
         

# rule_8 =  'odrl:prohibition' MUST have one 'odrl:assigner' of type Party who is issuing the policy if it is not explicitly defined. do the following steps:
#             step1: Declar One 'odrl:assigner' property value of odrl:Party class.
#             step2: generate 'odrl:uid' property value of type IRI to identify the Party.
#             step3: generate 'dc:description' of type String to describe a party from policy description. 
#             step4: reference the generated 'odrl:assigner' in side 'odrl:permission'.

#             below is an example of how the generated output should look like. 
#             example:
#                     drkodrl:"Policy assigner" a odrl:Party;
#                         odrl:uid "UI"^^xsd:anyURI;
#                         dc:description "AsignerDescription"^^xsd:string;
        
#             where "Policy assigner", "UI", "AsignerDescription" are placeholders, fill it with an appropriate value as mentioned above.                               
         

# rule_9 =  'odrl:prohibition' MUST have one 'odrl:target' property value of type Asset. If 'target' Type has not been explicitly defined, if it is not explicitly defined. do the following steps:
#             step1: Declar One 'odrl:target' property value of odrl:Asset class.
#             step2: generate 'odrl:uid' property value of type IRI to identify the Asset.
#             step3: generate 'dc:description' of type String, describe Asset from policy description. 
#             step4: reference the generated 'odrl:target' in side 'odrl:permission'.

#             below is an example of how the generated output should look like. 
#             example:
#                     drkodrl:"Policy Asset" a odrl:Asset;
#                         odrl:uid "UI"^^xsd:anyURI;
#                         dc:description "AssetDescription"^^xsd:string;
        
#             where "Policy Asset", "UI", "AssetDescription" are placeholders, fill it with an appropriate value as mentioned above.      
       

# rule_10 = for 'odrl:action' Property in 'odrl:prohibition' or 'odrl:prohibition' or 'odrl:obligation'  must have property value within standardized values include:
#             [odrl:use, odrl:transfer, odrl:acceptTracking, odrl:aggregate, odrl:annotate, odrl:anonymize, odrl:archive, odrl:attribute, odrl:compensate, odrl:concurrentUse, odrl:delete, odrl:derive, odrl:digitize, odrl:display, odrl:distribute, odrl:ensureExclusivity, odrl:execute, odrl:extract, odrl:give, odrl:grantUse, odrl:include, odrl:index, odrl:inform, odrl:install, odrl:modify, odrl:move, odrl:nextPolicy, odrl:obtainConsent, odrl:play, odrl:present, odrl:print, odrl:read, odrl:reproduce, odrl:reviewPolicy, odrl:sell, odrl:stream, odrl:synchronize, odrl:textToSpeech, odrl:transform, odrl:translate, odrl:uninstall, odrl:watermark, cc:Attribution, cc:CommercialUse, cc:DerivativeWorks, cc:Distribution, cc:Notice, cc:Reproduction, cc:ShareAlike, cc:Sharing, cc:SourceCode].
#             If none of the standardized values of action is defined please create a custom action using odrl:Action. inside the Rule. Example:
#                                 action [
#                                     a odrl:Action ;
#                                     "your_custom_actionName"^^xsd:string;
#                                 ] ;
            
#             where "your_custom_actionName" is a placeholders, fill it with an appropriate value based on 'action' as described in policy description.
         
# rule_11 =  do not define odrl:operator, odrl:rightOperand and odrl:rightOperand outside 'odrl:constrint' block. if it has been defined please relocate them in to 'odrl:constraint' block.
#                     as below:
#                     example:
#                          odrl:constraint[
#                                         a odrl:Constraint;
#                                         odrl:leftOperand "leftOperandPropertyValue";
#                                         odrl:operator "OperatorProperty";
#                                         odrl:rightOperand "rightOperandValue"^^xsd:dataType
#                                     ]
#                     where:
#                     "leftOperandPropertyValue" is a placeholders, fill it with an appropriate value based on constraint as described in policy description.
#                     "OperatorProperty" is a placeholders, fill it with an appropriate value based on operator as described in policy description.
#                     "rightOperandValue" is a placeholders, fill it with an appropriate value based on policy description.                    
         
# rule_12 =  for leftOperand property value. 
#               If the specified value is not one of the predefined LeftOperand instances (odrl:absolutePosition, odrl:absoluteSpatialPosition, odrl:absoluteTemporalPosition, odrl:absoluteSize, odrl:count, odrl:dateTime, odrl:delayPeriod, odrl:deliveryChannel, odrl:elapsedTime, odrl:event, odrl:fileFormat, odrl:industry, odrl:language, odrl:media, odrl:meteredTime, odrl:payAmount, odrl:percentage, odrl:product, odrl:purpose, odrl:recipient, odrl:relativePosition, odrl:relativeSpatialPosition, odrl:relativeTemporalPosition, odrl:relativeSize, odrl:resolution, odrl:spatial, odrl:spatialCoordinates, odrl:systemDevice, odrl:timeInterval, odrl:unitOfCount, odrl:version, odrl:virtualLocation). 
#               check the policy description and choose the most appropriate predefined LeftOperand based on the context. refine the 'dorl:leftOperand' value.

# rule_13 = 'odrl:constraint' MUST have one 'odrl:uid' property value of type IRI:
#                         if  'odrl:uid' is missed add
#                           odrl:uid "UI"^^xsd:anyURI; 
#                 where "UI" is placeholders, fill it with an appropriate value based on the odrl:constraint.
         

# rule_14 =  'odrl:operator' property in the constraint must be one of the predefined values( odrl:eq, odrl:gt, odrl:gteq, odrl:lt, odrl:lteq, odrl:neq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf) If the specified value is  is not one of the predefined operators refine the operator based on the policy description context. 
# rule_15 =  'odrl:constraint' MUST have one  odrl:dataType property specifying the data type of the rightOperand. if it is missed add to policy.
# rule_16 = Ensure that the 'odrl:rightOperand' property in the ODRL policy includes a data type for its value. 
# """
