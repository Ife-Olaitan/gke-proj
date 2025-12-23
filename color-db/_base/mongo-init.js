// Read environment variables set by the MongoDB StatefulSet
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

// Switch to the colordb database (creates it if it doesn't exist)
db = db.getSiblingDB(dbName);

console.log(`Initializing: ${dbName})`);
console.log(`Initializing: Creating user ${dbUser})`);

// Create the colordb_user user with limited permissions
db.createUser({
    user: dbUser,
    pwd: dbPassword,
    roles: [
        {
            role: 'readWrite',
            db: dbName
        }
    ]
});

console.log(`Initializing: Success!)`);