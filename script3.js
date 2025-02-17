// Function to handle user login
function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    // Validate inputs
    if (username === '' || password === '') {
        alert('Please fill in both fields');
        return;
    }

    // Get the user data from localStorage
    const storedUser = localStorage.getItem(username);

    if (!storedUser) {
        alert('Username not found. Please register first.');
        return;
    }

    const user = JSON.parse(storedUser);

    // Check if the password is correct
    if (user.password !== password) {
        alert('Incorrect password. Please try again.');
        return;
    }

    // If login is successful, redirect to the working10.html page
    window.location.href = 'hello.html';  // Update with the correct path to working10.html
}

// Redirect to registration page when "Sign Up" is clicked
function showRegistrationForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('registration-form').style.display = 'block';
}

// Redirect to login page when "Login" is clicked
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('registration-form').style.display = 'none';
}

// Function to handle user sign-up
function signUp() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate inputs
    if (username === '' || password === '' || confirmPassword === '') {
        alert('Please fill in all fields');
        return;
    }

    // Check if the passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    // Check if the username already exists in localStorage
    const existingUser = localStorage.getItem(username);
    if (existingUser) {
        alert('Username already exists. Please choose a different one.');
        return;
    }

    // Create a new user object and store it in localStorage
    const newUser = {
        username: username,
        password: password
    };
    localStorage.setItem(username, JSON.stringify(newUser));

    alert('Account created successfully! You can now log in.');
    showLoginForm();  // Switch back to login form after successful registration
}
