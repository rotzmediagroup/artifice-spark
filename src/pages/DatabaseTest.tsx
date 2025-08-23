import FirestoreConnectionTest from "@/components/FirestoreConnectionTest";

const DatabaseTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Database Connection Test</h1>
          <p className="text-muted-foreground">
            Testing Firestore connectivity, authentication, and data operations
          </p>
        </div>
        <FirestoreConnectionTest />
      </div>
    </div>
  );
};

export default DatabaseTest;