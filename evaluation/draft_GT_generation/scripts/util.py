from langchain_community.document_loaders import PyPDFLoader
from langchain_community.chat_models import ChatOpenAI
import tiktoken
import fitz  # PyMuPDF
import aiohttp
import asyncio
import os
from importlib.metadata import PackageNotFoundError, version
from rdflib import Graph
import yaml
from langchain_community.graphs import RdfGraph

# LLM seetings 

# set OPENAI_API_KEY
def set_openai_api_key(api_key=None):
    """
    Set OPENAI_API_KEY with the following priority:
    1) explicit function argument
    2) existing OPENAI_API_KEY environment variable
    3) constants.APIKEY (if local constants.py exists)
    """
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
        return os.environ["OPENAI_API_KEY"]

    env_api_key = os.environ.get("OPENAI_API_KEY")
    if env_api_key:
        return env_api_key

    fallback_key = None
    try:
        import constants  # type: ignore

        fallback_key = getattr(constants, "APIKEY", None)
    except Exception:
        fallback_key = None

    if not fallback_key:
        raise ValueError(
            "API key is not set. Please set OPENAI_API_KEY or pass an explicit key."
        )

    os.environ["OPENAI_API_KEY"] = fallback_key
    return os.environ["OPENAI_API_KEY"]

# ckeck the langchain version
def print_version(package_name):
    try:
        pkg_version = version(package_name)
        print(f"The version of the {package_name} library is {pkg_version}.")
    except PackageNotFoundError:
        print(f"The {package_name} library is not installed.")


# Initialize language model
def gpt_4():
    """
    Initializes and returns a ChatOpenAI language model instance configured for GPT-4 with specified settings.

    Returns:
    - ChatOpenAI: An instance of the ChatOpenAI language model configured for GPT-4.
    """
    return ChatOpenAI(temperature=0.7, model="gpt-4", verbose=True)


def gpt_3_5_turbo():
    """
    Initializes and returns a ChatOpenAI language model instance configured for GPT-3.5-turbo with specified settings.

    Returns:
    - ChatOpenAI: An instance of the ChatOpenAI language model configured for GPT-3.5-turbo.
    """
    return ChatOpenAI(temperature=0.7, model="gpt-3.5-turbo", verbose=True)

def initialize_language_model(
    LLMmodel,
    temperature=0.7,
    verbose=True,
    openai_api_base=None,
    openai_api_key=None,
):
    """
    Initializes and returns a ChatOpenAI language model instance with specified settings.

    Parameters:
    - model (str): Specifies the language model to use. For example, "gpt-4", "gpt-3.5-turbo", etc.

    Returns:
    - ChatOpenAI: An instance of the ChatOpenAI language model.
    """
    kwargs = {
        "temperature": temperature,
        "model": LLMmodel,
        "verbose": verbose,
    }
    if openai_api_base:
        kwargs["openai_api_base"] = openai_api_base
    if openai_api_key:
        kwargs["openai_api_key"] = openai_api_key
    return ChatOpenAI(**kwargs)

class SimpleLLMChain:
    """Compatibility wrapper that keeps a `.run()` API."""

    def __init__(self, llm, prompt_template):
        self.llm = llm
        self.prompt_template = prompt_template

    def run(self, inputs):
        prompt = self.prompt_template.format(**inputs)
        response = self.llm.invoke(prompt)
        if hasattr(response, "content"):
            return response.content
        return str(response)


def setup_llm_chain(llm, prompt_template):
    """
    Sets up and returns a Language Model Chain (LLMChain) instance.

    Parameters:
    - llm (ChatOpenAI): An instance of the ChatOpenAI language model.
    - prompt_template (PromptTemplate): A template for constructing prompts to be used with the language model.

    Returns:
    - LLMChain: An instance of the Language Model Chain configured with the provided language model and prompt template.
    """
    return SimpleLLMChain(llm=llm, prompt_template=prompt_template)

def graph_from_file(file_path: str) -> Graph:
    """
    Parses an RDF file and creates an in-memory knowledge graph from it.

    The file at the given path is loaded into an RDFlib graph in order to create an in-memory knowledge graph.

    Parameters
    ----------
    file_path
        The path to the RDF file which should be loaded into an RDFlib graph.

    Returns
    -------
    Graph
        An RDFlib graph containing the RDF data from the parsed file.
    """
    return Graph().parse(file_path)


def load_use_cases(yaml_file_path):
    import sys
    try:
        with open(yaml_file_path, "r") as file:
            use_cases = yaml.safe_load(file)
        return use_cases
    except FileNotFoundError:
        print(f"Error: File '{yaml_file_path}' not found.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error while loading YAML file: {e}")
        sys.exit(1)

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        # Open the PDF file
        with fitz.open(pdf_path) as pdf_document:
            # Iterate through pages and extract text
            for page_number in range(pdf_document.page_count):
                page = pdf_document[page_number]
                text += page.get_text("text")
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    
    return text

def measure_token_length(text, model_name="gpt-4"):
    try:
        encoding = tiktoken.encoding_for_model(model_name)
        encoded_text = encoding.encode(text)
        return len(encoded_text)
    except Exception as e:
        print(f"Error measuring token length: {e}")
        return 0  # Return a default value or handle as appropriate 

#  file settings 

def get_pdf_path(file_name):
    current_dir = os.path.dirname(__file__)
    return os.path.join(current_dir, "llm_guidance_template", "templates", file_name)

def load_odrl_template_PDF(directory):
    """
    Load an ODRL ontology from a PDF file.

    Parameters:
    - directory (str): The directory where the PDF file is located.
   

    Returns:
    - odrl_ontology (object): The loaded ODRL ontology object.
    """
    pdf_path = directory

    try:
        pdf_loader = PyPDFLoader(file_path=pdf_path)
        odrl_ontology = pdf_loader.load()
        return odrl_ontology
    except FileNotFoundError:
        print(f"Error: File not found - {pdf_path}")
    except Exception as e:
        print(f"Error: An unexpected error occurred - {e}")

    return None  # Return a default value or handle as appropriate

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        # Open the PDF file
        with fitz.open(pdf_path) as pdf_document:
            # Iterate through pages and extract text
            for page_number in range(pdf_document.page_count):
                page = pdf_document[page_number]
                text += page.get_text("text")
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    
    return text

def measure_token_length(text, model_name="gpt-4"):
    try:
        encoding = tiktoken.encoding_for_model(model_name)
        encoded_text = encoding.encode(text)
        return len(encoded_text)
    except Exception as e:
        print(f"Error measuring token length: {e}")
        return 0  # Return a default value or handle as appropriate 
    
def save_odrl_to_text(odrl_policy, file_name):

     # Comment on the ODRL policy
    # commented_policy = comment_and_keep_codes(odrl_policy)

    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'out'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.txt')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(odrl_policy)

def save_odrl_to_ttl(odrl_policy, file_name):

     # Comment on the ODRL policy
    commented_policy = comment_and_keep_codes(odrl_policy)

    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'generated_odrl_from_ontology'
    # out_folder = 'generated_odrl_policy_from_template'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.ttl')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(commented_policy)


def save_refined_odrl(odrl_policy, file_name):

     # Comment on the ODRL policy
    commented_policy = comment_and_keep_codes(odrl_policy)

    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'generated_odrl_policy_from_template'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.ttl')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(commented_policy)



def save_odrl_from_template(odrl_policy, file_name):

     # Comment on the ODRL policy
    commented_policy = comment_and_keep_codes(odrl_policy)

    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'generated_odrl_policy_from_template'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.ttl')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(commented_policy)


def delete_comment_and_keep_codes(policy_text):
    """
    Extracts and keeps only the TTL code from a given text containing mixed code and comments.

    Args:
        policy_text (str): The input text containing both code and comments.

    Returns:
        str: The extracted TTL code.
    """
    lines = policy_text.split('\n')
    ttl_code_lines = []
    inside_code_block = False

    for line in lines:
        # Check if the line contains code (starts or ends with ``` or contains a non-space character)
        if "```" in line or line.strip():
            if "```" in line:
                inside_code_block = not inside_code_block
                if inside_code_block:
                    # Skip the first line containing ```ttl
                    if "```" not in line:
                        ttl_code_lines.append(line)
            elif inside_code_block:
                # Keep code lines inside code blocks
                ttl_code_lines.append(line)
        else:
            # Skip non-TTL code lines
            pass

    # Join the lines back into a single string
    result_policy_text = '\n'.join(ttl_code_lines)

    return result_policy_text


def save_self_corrected_odrl(odrl_policy, file_name):

    """
    Save a self-corrected ODRL policy to a TTL file.

    Args:
        odrl_policy (str): The ODRL policy to be saved.
        file_name (str): The name of the file to save the ODRL policy as.

    Returns:
        None
    """
    # Comment on the ODRL policy
    commented_policy = delete_comment_and_keep_codes(odrl_policy)

    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'self_corrected_odrl_policies'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.ttl')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(commented_policy)


def save_to_ttl(text, file_name):
    # Create the "out" folder in the current directory if it doesn't exist
    out_folder = 'out'
    if not os.path.exists(out_folder):
        os.makedirs(out_folder)

    # Check if the file already exists, and remove it
    file_path = os.path.join(out_folder, f'{file_name}.ttl')
    if os.path.exists(file_path):
        os.remove(file_path)

    # Save the ODRL policy to a TTL file
    with open(file_path, 'w') as ttl_file:
        ttl_file.write(text)

def load_ttl_from_file(file_path):
    """
    Load TTL content from a file.

    Args:
        file_path (str): The path to the TTL file.

    Returns:
        str: The content of the TTL file as a string.
    """
    try:
        with open(file_path, 'r') as file:
            ttl_content = file.read()
        return ttl_content
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return None
    
    
def comment_odrl_policy(policy_text):
    lines = policy_text.split('\n')
    commented_lines = []

    for line in lines:
        # Check if the line contains relevant information to comment
        if "drkodrl:" in line or "odrl:" in line or "dct:" in line or "xsd:" in line:
            # Add a comment prefix to the line
            commented_lines.append("# " + line)
        else:
            # Preserve non-relevant lines
            commented_lines.append(line)

    # Join the lines back into a single string
    commented_policy_text = '\n'.join(commented_lines)

    return commented_policy_text

def comment_and_keep_codes(policy_text):
    lines = policy_text.split('\n')
    commented_and_code_lines = []
    inside_code_block = False

    for line in lines:
        # Check if the line contains code (starts or ends with ``` or contains a non-space character)
        if "```" in line or line.strip():
            if "```" in line:
                inside_code_block = not inside_code_block
            if inside_code_block:
                # Keep code lines inside code blocks
                if "```"  in line:
                    commented_and_code_lines.append("# " + line)
                else:
                    commented_and_code_lines.append(line)
            else:
                # Add comments to other lines
                commented_and_code_lines.append("# " + line)
        else:
            # Preserve empty lines
            commented_and_code_lines.append(line)

    # Join the lines back into a single string
    result_policy_text = '\n'.join(commented_and_code_lines)

    return result_policy_text
def load_ontology(path):
    try:
        graph = RdfGraph(
            source_file=path,
            serialization="ttl",
            standard="owl"
        )
        graph.load_schema()
        print(f"Ontology loaded successfully from {path}")
        return graph
    except Exception as e:
        print(f"Error loading ontology from {path}: {e}")
        return None

async def fetch_data(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def process_url_data(url):
    try:
        data = await fetch_data(url)
        return data  # Return the contents of ODRL22.ttl
    except Exception as e:
        print(f"An error occurred while loading the URL: {e}")
        return None  # Return None in case of an error

# Keep module import side-effect free.

