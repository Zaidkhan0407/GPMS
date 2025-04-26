import pymongo
import sys

# MongoDB connection string
MONGO_URI = "mongodb+srv://zaidk051103:4ZrSBVosE13ZDVR7@aipms.e20p3ss.mongodb.net/?retryWrites=true&w=majority&appName=AIPMS"

try:
    # Create a new client and connect to the server
    client = pymongo.MongoClient(MONGO_URI)
    
    # Send a ping to confirm a successful connection
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1) # Exit with error code if ping fails

except pymongo.errors.ConfigurationError as e:
    print(f"Configuration error: {e}")
    sys.exit(1) # Exit with error code for configuration issues
except pymongo.errors.ConnectionFailure as e:
    print(f"Connection failure: {e}")
    sys.exit(1) # Exit with error code for connection failures
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    sys.exit(1) # Exit with error code for other errors
finally:
    # Ensures that the client will close when you finish/error
    if 'client' in locals() and client:
        client.close()
        print("MongoDB connection closed.")