import os
import json

# Load configuration from config/config.json
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_path = os.path.join(PROJECT_DIR, 'config', 'config.json')
with open(config_path, 'r') as f:
    config = json.load(f)

# Define the project base directory
BASE_DIR = PROJECT_DIR

# Define paths using the configuration file
ODRL_POLICY_DIRECTORY = os.path.join(BASE_DIR, config['ODRL_POLICY_DIRECTORY'])
ODRL_POLICY_ONTOLOGY_GEN = os.path.join(BASE_DIR, config['ODRL_POLICY_ONTOLOGY_GEN'])
REFINED_ODRL = os.path.join(BASE_DIR, config['REFINED_ODRL'])
ODRL_ONTOLOGY_PATH = os.path.join(BASE_DIR, config['ODRL_ONTOLOGY_PATH'])
AGREEMENT_SHAPES = os.path.join(BASE_DIR, config['AGREEMENT_SHAPES'])
OFFER_SHAPES = os.path.join(BASE_DIR, config['OFFER_SHAPES'])
RULE_SHAPES = os.path.join(BASE_DIR, config['RULE_SHAPES'])
SELF_CORRECTION_PATH = os.path.join(BASE_DIR, config['SELF_CORRECTION_PATH'])
POLICY_FILE_NAME = config['POLICY_FILE_NAME']
TRANSLATOR_FILE_NAME = config['TRANSLATOR_FILE_NAME']
OFFER_TEMPLATE = os.path.join(BASE_DIR,config['OFFER_TEMPLATE'])
AGREEMENT_TEMPLATE = os.path.join(BASE_DIR,config['AGREEMENT_TEMPLATE'])
RULE_TEMPLATE = os.path.join(BASE_DIR,config['RULE_TEMPLATE'])


# Rest of the code remains the same...

# OFFER_TEMPLATE  = "ODRL-Offer_Generator_Template.pdf" 
# AGREEMENT_TEMPLATE = "ODRL-Agreement_Generator_template.pdf"
# RULE_TEMPLATE = "ODRL_Rule_Generator_template.pdf"



# # Path for the directory containing ODRL files:
# ODRL_POLICY_DIRECTORY = "generated_odrl_from_template"
# ODRL_POLICY_ONTOLOGY_GEN = "generated_odrl_from_ontology"
# REFINED_ODRL = "refined_odrl"

# # Define the path as a constant
# ODRL_ONTOLOGY_PATH = "data/ontology/odrl.ttl"



# # Path for the directory containing ODRL Shapes:
# AGREEMENT_SHAPES = "ODRL_policy_validation_shapes/ODRL_Agreement_Shape.ttl"
# OFFER_SHAPES = "ODRL_policy_validation_shapes/ODRL_Offer_Shape.ttl"
# RULE_SHAPES = "ODRL_policy_validation_shapes/ODRL_Rule_Shapes.ttl"



# POLICY_FILE_NAME  = "ODRL-Policy_v4.pdf"
# TRANSLATOR_FILE_NAME = "ODRL-Translator.pdf"
# SELF_CORRECTION_PATH = r'C:\Users\mustafa\Desktop\odrl-langchane\refined_odrl'
# # pip show langchain




# Define the use case descriptions
USE_CASE_DESCRIPTIONS = {
    "use_case_1": {
        "type": "Agreement",
        "description": """The DE_Staatstheater_Augsburg, a German cultural organization, manages the dataAPI 'ShowTimesAPI'. This dataAPI holds valuable cultural assets. Policy regulates access to this dataAPI, granting subscribers like 'Regional Newspaper', 'Culture Research Institute', and 'Cultural Platform Bavaria'. Access is restricted to Germany, and usage rights expire on May 10, 2025."""
    },
    "use_case_2": {
        "type": "Agreement",
        "description": """The Skulpturensammlung museum wants to provide public access to digital reproductions of the artwork 'Große Düne' by C. D. Friedrich. Museum Münzkabinett and are permitted to view and download digital images for Sharing and non-commercial use."""
    },
    "use_case_3": {
        "type": "Agreement",
        "description": """The DE_Staatstheater_Augsburg collaborates with a local university for an educational program on theater history and cultural heritage. They offer access to the 'HistoricalArchives' Asset, containing digitized historical data. Access is free for scientific research, enabling scholars to explore the dataset without fees."""
    },
    "use_case_4": {
        "type": "Agreement",
        "description": """The Münzkabinett museum provides access to a digital repository of ArchiveEvent. Users must register with a valid user ID, which can be either an ORCID or an email address, to access the repository. The policy ensures that only authenticated users can view and download the ArchiveEvent."""
    },
    "use_case_5": {
        "type": "Offer",
        "description": """Kupferstich-Kabinett introduces the 'Vorlagenzeichner' artwork as an asset, permitting access for a one-month duration. The policy includes restrictions on the type of device (loggingServer) used to access the artwork."""
    },
    "use_case_6": {
        "type": "Offer",
        "description": """The Kupferstich-Kabinett museum provides digital images of the artwork 'Bauernhäuser am Berghang' by Caspar David Friedrich.
        - Small and Medium Images: These images are freely accessible to everyone. No membership is required to view or download them.
        - Original High-Resolution Image: Access to this image is restricted to members of the Kupferstich-Kabinett museum. Membership verification is required to obtain this high-resolution image."""
    },
    "use_case_7": {
        "type": "Offer",
        "description": """For 'Landschaft mit kahlem Baum' Artwork
        To be presented in a virtual format, the following policy applies:
        - Event Format: The presentation of 'Landschaft mit kahlem Baum' will be conducted as a virtual event.
        - Geographic Limitation: Access to the virtual presentation is restricted to participants with verified IP addresses located within Germany.
        - No Copying: Participants are strictly prohibited from copying or distributing any digital content presented during the virtual event."""
    },
    "use_case_8": {
        "type": "Offer",
        "description": """The Kupferstich-Kabinett museum provides digital images of various artworks. 
        - Resolution for Print Purposes: If the resolution of the digital image exceeds 300 dpi, a fee applies for access.
        - General Access: Images with a resolution of 300 dpi or lower are freely accessible to the public without any fees."""
    },
    "use_case_9": {
        "type": "Offer",
        "description": """The Kupferstich-Kabinett museum provides digital images of its artwork collection with the following usage limitations:
        - Viewing Limitations: Users are limited to viewing a maximum of 50 images per day. This ensures fair usage and availability of resources to all users.
        - High-Resolution Downloads: Downloading high-resolution images (greater than 300 dpi) requires a special request and an additional fee."""
    },
    "use_case_10": {
        "type": "Rule",
        "description": """The Münzkabinett Museum must pay a fee of 500 euros for the digitization of the 'Todestag' artwork."""
    },
    "use_case_11": {
        "type": "Rule",
        "description": """The Münzkabinett does not charge fees for the provision of data when the purpose is the enhancement of reputation or marketing promotion."""
    },
    "use_case_12": {
        "type": "Rule",
        "description": """The Münzkabinett Museum seeks permission where purpose is an instance of ArchiveEvent."""
    }
}


# from llama_index.llms.litellm_utils import openai_modelname_to_contextsize


# def print_model_context_size(model_name):
#     # Get the maximum context size
#     max_context_size = OpenAI.modelname_to_contextsize(model_name)

#     # Print or use the max context size as needed
#     print(f"Max Token Size for {model_name}: {max_context_size}")

# model_name = "gpt-4"
# td= "text-davinci-003"
# gpt_3 = "gpt-3.5-turbo"
# print_model_context_size(td)
# print_model_context_size(gpt_3)
# print_model_context_size(model_name)