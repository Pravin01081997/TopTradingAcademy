document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL USER STATE (Now handled by Firebase Auth) ---
    // Removed hardcoded AUTH_EMAIL, AUTH_NAME, AUTH_PURCHASED_COURSES.
    // User data will be fetched from Firestore on login.

    // --- 1. AUTHENTICATION & UI LOGIC ---

    const loggedOutButtons = document.getElementById('loggedOutButtons');
    const loggedInProfile = document.getElementById('loggedInProfile');
    const profileNameElement = document.getElementById('profileName');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileBtn = document.getElementById('profileBtn');

    // Function to update the header UI based on Firebase auth state
    function updateAuthState(user) {
        if (loggedOutButtons && loggedInProfile) {
            if (user) {
                // User is logged in: Show Profile, Hide Login/Signup
                loggedOutButtons.classList.add('hidden');
                loggedInProfile.classList.remove('hidden');
                if (profileNameElement) {
                    profileNameElement.textContent = user.displayName || 'Profile'; // Use displayName from Auth
                }
            } else {
                // User is logged out: Show Login/Signup, Hide Profile
                loggedOutButtons.classList.remove('hidden');
                loggedInProfile.classList.add('hidden');
            }
        }
        
        // Check course access on auth state change
        checkCourseAccess(user);
    }

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            auth.signOut().then(() => {
                alert('You have been logged out.');
                // Redirect to homepage or refresh course page to lock content
                if (window.location.pathname.includes('stock-basics.html')) {
                    window.location.reload(); 
                }
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        };
    }
    
    // Handle Profile Button click
    if (profileBtn) {
        profileBtn.onclick = function() {
            // Fetch user data from Firestore to show purchased courses
            const user = auth.currentUser;
            if (user) {
                db.collection('users').doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        alert(`Welcome back, ${data.name}! Your purchased courses: ${data.purchasedCourses.join(', ').toUpperCase()}`);
                    } else {
                        alert('User data not found.');
                    }
                }).catch((error) => {
                    console.error('Error fetching user data:', error);
                });
            }
        };
    }
    
    // Firebase Auth State Listener (replaces manual updateAuthState calls)
    auth.onAuthStateChanged((user) => {
        updateAuthState(user);
    });

    // --- 2. SMOOTH SCROLLING FOR NAVIGATION LINKS (Used on index.html) ---
    const navLinks = document.querySelectorAll('nav a, .floating-upi-btn');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 70, 
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // --- 3. COURSE BUTTON INTERACTIVITY (Used on index.html) ---
    const buyButtons = document.querySelectorAll('.buy-now');

    buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const courseTitle = button.closest('.course-card, .session-card').querySelector('h3').textContent.trim();
            
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) {
                window.scrollTo({
                    top: paymentSection.offsetTop - 70, 
                    behavior: 'smooth'
                });
                alert(`Redirecting to UPI payment for "${courseTitle}". After payment, your purchase will be verified in Firestore.`);
            }
        });
    });

    // --- 4. ACCESS CONTROL LOGIC (Used on stock-basics.html) ---
    const unlockBtn = document.getElementById('unlock-btn');
    const userEmailInput = document.getElementById('user-email');
    
    if (unlockBtn && userEmailInput) {
        unlockBtn.addEventListener('click', handleAccessCheck);
    }
    
    function handleAccessCheck() {
        const enteredEmail = userEmailInput.value.trim().toLowerCase();
        const user = auth.currentUser;
        
        if (user && user.email.toLowerCase() === enteredEmail) {
            // Check Firestore for purchased courses
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists && doc.data().purchasedCourses.includes('stock-basics')) {
                    grantCourseAccess();
                    userEmailInput.style.borderColor = 'green';
                    alert(`Success! All course features are now UNLOCKED for ${enteredEmail}. Click any lesson link to view its content.`);
                } else {
                    userEmailInput.style.borderColor = 'red';
                    alert('Access Denied. Purchase not verified in database. Please complete payment.');
                }
            }).catch((error) => {
                console.error('Error checking access:', error);
                alert('Error verifying access. Try again.');
            });
        } else {
            userEmailInput.style.borderColor = 'red';
            alert('Access Denied. Please log in with the correct email.');
        }
    }
    
    function grantCourseAccess() {
        const lessonLinks = document.querySelectorAll('.course-syllabus .lesson-link');
        const accessControlBox = document.querySelector('.access-control-box');
        
        if (accessControlBox) {
            accessControlBox.innerHTML = '<h3><i class="fas fa-check-circle"></i> Access Granted!</h3><p>Enjoy the full course content.</p>';
            accessControlBox.style.border = '1px solid #28a745';
            accessControlBox.style.backgroundColor = '#e6ffed';
        }
        
        lessonLinks.forEach((link, index) => {
            if (index >= 0) { 
                let linkText = link.textContent;
                linkText = linkText.replace('(Free Preview)', '').replace('(Unlock Required)', '');
                
                link.setAttribute('data-lesson', index + 1); 
                
                link.innerHTML = `<i class="fas fa-video"></i> ${index + 1}. ${linkText.trim()}`;
                link.classList.add('unlocked-lesson'); 
                link.classList.remove('locked-content');
                link.href = '#'; 
                link.onclick = (e) => {
                    e.preventDefault();
                    switchLessonContent(index + 1);
                };
            }
        });
    }

    // Check course access based on Firebase user and Firestore data
    function checkCourseAccess(user) {
        const courseId = 'stock-basics';
        
        if (window.location.pathname.includes(courseId)) {
            if (user) {
                db.collection('users').doc(user.uid).get().then((doc) => {
                    if (doc.exists && doc.data().purchasedCourses.includes(courseId)) {
                        grantCourseAccess();
                    } else {
                        const accessControlBox = document.querySelector('.access-control-box');
                        if (accessControlBox) {
                            accessControlBox.innerHTML = `<h3><i class="fas fa-exclamation-triangle"></i> Complete Your Purchase</h3><p>You are logged in as ${user.displayName}. Your access has not been verified yet. Click 'Check Access' with your email to unlock.</p><div class="form-group"><input type="email" id="user-email" placeholder="Enter your email" required></div><button id="unlock-btn" class="cta-button primary-cta">Check Access</button>`;
                        }
                    }
                }).catch((error) => {
                    console.error('Error checking course access:', error);
                });
            }
        }
    }

    // --- 5. LESSON TAB SWITCHING LOGIC (Used ONLY on stock-basics.html) ---
    
    const isCoursePage = document.getElementById('course-title');
    
    if (isCoursePage) { 
        const videoPlaceholder = document.getElementById('video-placeholder');
        const lessonPassageTitle = document.getElementById('lesson-passage-title');
        const lessonPassageContent = document.getElementById('lesson-passage-content');
        const downloadLink = document.getElementById('download-link');
        const syllabusLinks = document.querySelectorAll('.course-syllabus .lesson-link');

        const localVideoEmbed = (lessonNumber) => `
            <video controls poster="images/video-poster.jpg">
                <source src="videos/stock-basics-lesson-${lessonNumber}.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;

        const lessonData = {
            1: { 
                title: "What is a Stock? Understanding Equity", 
                video: localVideoEmbed(1), 
                passage: "A stock represents fractional ownership in a company. When you buy a stock, you are buying a tiny piece of that corporation and its assets. The price is driven by supply and demand in the secondary market.",
                pdf: "pdfs/Lesson_1_Summary.pdf"
            },
            2: { 
                title: "Market Structures (BSE, NSE, etc.)", 
                video: localVideoEmbed(2), 
                passage: "Markets are broadly divided into primary (IPOs) and secondary (trading). Key structures include exchanges (NSE/BSE) and regulated bodies (SEBI). Understanding these governs trade execution.",
                pdf: "pdfs/Lesson_2_Structures.pdf"
            },
            3: { 
                title: "Bull vs. Bear Markets & Cycles", 
                video: localVideoEmbed(3), 
                passage: "A Bull Market means prices are generally rising (optimism), and a Bear Market means prices are generally falling (pessimism). Identifying these cycles is key to long-term profitability.",
                pdf: "pdfs/Lesson_3_Cycles.pdf"
            },
            4: { 
                title: "Reading a Stock Quote (The Basics)", 
                video: localVideoEmbed(4), 
                passage: "A stock quote includes Ticker Symbol, Last Traded Price (LTP), Volume, High/Low, and P/E Ratio. Knowing how to read these figures gives you the current pulse of the stock.",
                pdf: "pdfs/Lesson_4_Quote.pdf"
            },
            5: { 
                title: "Quiz & Certificate Preparation", 
                video: localVideoEmbed(5), 
                passage: "This module prepares you for the final assessment. Review key terms like CAGR, Dividends, and Margin. A passing grade unlocks your trading certificate.",
                pdf: "pdfs/Lesson_5_Review.pdf"
            }
        };

        window.switchLessonContent = function(lessonId) {
            const data = lessonData[lessonId];
            if (!data) return;

            document.getElementById('course-title').textContent = data.title;
            document.getElementById('video-placeholder').innerHTML = data.video;
            document.getElementById('lesson-passage-title').textContent = "Passage to Read: " + data.title;
            document.getElementById('lesson-passage-content').innerHTML = `<p>${data.passage}</p>`;
            document.getElementById('download-link').href = data.pdf;
            
            syllabusLinks.forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`.course-syllabus a[data-lesson="${lessonId}"]`);
            if (activeLink) activeLink.classList.add('active');
            
            window.scrollTo({
                top: document.querySelector('.course-header').offsetTop - 70,
                behavior: 'smooth'
            });
        }

        switchLessonContent(1);
    }
    
    // --- 6. LOGIN/SIGNUP MODAL LOGIC ---
    
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const closeBtns = document.querySelectorAll('.close-btn');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink'); 
    
    function openModal(modal) {
        if (loginModal) loginModal.style.display = 'none';
        if (signupModal) signupModal.style.display = 'none';
        
        if (modal) modal.style.display = 'block';
    }

    if (loginBtn && signupBtn) {
        loginBtn.onclick = function() {
            openModal(loginModal);
        }
        
        signupBtn.onclick = function() {
            openModal(signupModal);
        }
    }
    
    closeBtns.forEach(btn => {
        btn.onclick = function() {
            if (loginModal) loginModal.style.display = 'none';
            if (signupModal) signupModal.style.display = 'none';
        }
    });

    window.onclick = function(event) {
        if (event.target == loginModal) {
            loginModal.style.display = "none";
        }
        if (event.target == signupModal) {
            signupModal.style.display = "none";
        }
    }

    if (switchToSignup) {
        switchToSignup.onclick = function(e) {
            e.preventDefault();
            openModal(signupModal);
        }
    }
    
    if (switchToLogin) {
        switchToLogin.onclick = function(e) {
            e.preventDefault();
            openModal(loginModal);
        }
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.onclick = function(e) {
            e.preventDefault();
            alert('A password reset link would be sent to your email. (Requires server-side setup)');
            if (loginModal) loginModal.style.display = 'none';
        }
    }
    
    // Signup Form: Create user in Auth and store data in Firestore
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = function(e) {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    // Update display name in Auth
                    user.updateProfile({ displayName: name });
                    // Store additional data in Firestore
                    return db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        purchasedCourses: [] // Start with no purchases; update after payment
                    });
                })
                .then(() => {
                    alert('Account created! Please log in.');
                    openModal(loginModal);
                })
                .catch((error) => {
                    console.error('Signup error:', error);
                    alert('Signup failed: ' + error.message);
                });
        };
    }
    
    // Login Form: Authenticate and fetch data from Firestore
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    alert(`Login successful! Welcome back, ${userCredential.user.displayName}.`);
                    if (loginModal) loginModal.style.display = 'none';
                })
                .catch((error) => {
                    console.error('Login error:', error);
                    alert('Login Failed: ' + error.message);
                });
        };
    }
});
