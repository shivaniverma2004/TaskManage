# WorkBoard Task Manager

WorkBoard is a role-based project and task management web app built for the assignment requirement:

- Authentication with signup and login
- Admin and Member role-based access
- Team creation with selected members and a team leader
- Project creation, project details, task assignment, task deletion, and status tracking
- Dashboard for project completion, task status, and overdue work
- REST APIs with SQL database relationships
- Railway-ready deployment

## Tech Stack

- Java 17
- Spring Boot
- Spring Security password hashing with BCrypt
- Spring Data JPA
- H2 database for local development
- PostgreSQL for Railway deployment
- Static HTML, CSS, and JavaScript frontend served by Spring Boot

## Local Setup

Start the app locally:

```bash
DEFAULT_ADMIN_NAME="Project Admin" \
DEFAULT_ADMIN_EMAIL="your-admin-email@example.com" \
DEFAULT_ADMIN_PASSWORD="your-strong-password" \
PORT=8081 \
./mvnw spring-boot:run
```

Open:

```text
http://localhost:8081
```

The admin account is created from the environment variables above. Normal signup creates `MEMBER` users only.

Local data is stored in:

```text
data/taskmanager.mv.db
```

## Main User Flow

1. Admin logs in.
2. Members sign up from the signup tab.
3. Admin creates teams from registered members.
4. Admin assigns a team leader.
5. Admin creates a project and links a team to it.
6. Admin or the team leader creates tasks for project members.
7. Members update their assigned task status.
8. Dashboard shows counts, completion, and overdue tasks.

## REST API Summary

Authenticated requests use:

```http
Authorization: Bearer <token>
```

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/users`

Projects:

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `POST /api/projects/{id}/members`

Teams:

- `GET /api/teams`
- `POST /api/teams`
- `PUT /api/teams/{id}`
- `DELETE /api/teams/{id}`

Tasks:

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `PATCH /api/tasks/{id}/status`

Dashboard:

- `GET /api/dashboard`

## GitHub Submission Steps

From the project folder:

```bash
git init
git add .
git commit -m "Build role-based project task manager"
```

Create a new GitHub repository, then connect and push:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Use that GitHub repo URL in the assignment submission.

## Railway Deployment Steps

1. Go to Railway and create a new project.
2. Choose `Deploy from GitHub repo`.
3. Select this repository.
4. Add a Railway PostgreSQL database to the project.
5. Open the app service, then go to `Variables`.
6. Add these variables:

```env
JDBC_DATABASE_URL=jdbc:postgresql://HOST:PORT/DATABASE
JDBC_DATABASE_USERNAME=DATABASE_USER
JDBC_DATABASE_PASSWORD=DATABASE_PASSWORD
JDBC_DATABASE_DRIVER=org.postgresql.Driver
DEFAULT_ADMIN_NAME=Project Admin
DEFAULT_ADMIN_EMAIL=your-admin-email@example.com
DEFAULT_ADMIN_PASSWORD=your-strong-password
```

Use the PostgreSQL connection details shown by Railway for `HOST`, `PORT`, `DATABASE`, `DATABASE_USER`, and `DATABASE_PASSWORD`.

7. Railway will build the app with Maven and start it using the `Procfile`.
8. After deployment finishes, open the generated Railway domain.
9. Login with the admin email and password you set in Railway variables.

## Railway Notes

- Do not put real passwords in GitHub.
- Set production admin credentials only in Railway variables.
- If you change admin variables after the admin user already exists, the app will not overwrite the existing password automatically. Create the desired admin credentials before the first production run, or update the database manually.
- Signup users are members, not admins.

## Assignment Submission Checklist

- Live Application URL: https://www.generous-simplicity-production-ff0e.up.railway.app/
- README: this file
- Demo Video: 2-5 minutes showing login, member signup, team creation, project creation, task assignment, status updates, delete actions, and dashboard progress
