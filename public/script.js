// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://errhfqpieusjyhcqmkvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycmhmcXBpZXVzanloY3Fta3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjI5NDYsImV4cCI6MjA3ODc5ODk0Nn0.itCPW4NSpDHFA4M3luacuPI8WC6RcR3i1_sXFPL47Eg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== THEME MANAGEMENT =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ===== PAGE NAVIGATION =====
function showPage(pageName) {
    document.getElementById('feedPage').style.display = 'none';
    document.getElementById('profilePage').style.display = 'none';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (pageName === 'feed') {
        document.getElementById('feedPage').style.display = 'block';
        document.querySelector('[data-page="feed"]').classList.add('active');
        loadPosts();
    } else if (pageName === 'profile') {
        document.getElementById('profilePage').style.display = 'block';
        document.querySelector('[data-page="profile"]').classList.add('active');
        loadProfile();
    }
}

// ===== AUTH PAGE NAVIGATION =====
function showSignup() {
    document.getElementById('signinSection').style.display = 'none';
    document.getElementById('signupSection').style.display = 'block';
}

function showSignin() {
    document.getElementById('signupSection').style.display = 'none';
    document.getElementById('signinSection').style.display = 'block';
}

// ===== AUTHENTICATION FUNCTIONS =====
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
                emailRedirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: fullName,
                        email: email
                    }
                ]);

            if (profileError) {
                console.error('Profile creation error:', profileError);
            }
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authPage').style.display = 'flex';
        showSignin();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authPage').style.display = 'flex';
        return null;
    }
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    return user;
}

async function checkAuthRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        showPage('feed');
    }
}

// ===== PROFILE FUNCTIONS =====
async function loadProfile() {
    try {
        const user = await checkAuth();
        if (!user) return;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const profile = data || {};

        document.getElementById('displayName').textContent = profile.full_name || 'Not set';
        document.getElementById('displayEmail').textContent = user.email;
        document.getElementById('displayDepartment').textContent = profile.department || 'Not set';
        document.getElementById('displayClass').textContent = profile.class || 'Not set';
        document.getElementById('displaySection').textContent = profile.section || 'Not set';
        document.getElementById('displayGender').textContent = profile.gender || 'Not set';
        document.getElementById('displayNickname').textContent = profile.nickname || 'Not set';
        document.getElementById('displayAge').textContent = profile.age || 'Not set';
        document.getElementById('displayHobby').textContent = profile.hobby || 'Not set';
        document.getElementById('displayBio').textContent = profile.bio || 'Not set';

        const initials = (profile.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('avatarInitials').textContent = initials;

        document.getElementById('fullNameEdit').value = profile.full_name || '';
        document.getElementById('nickname').value = profile.nickname || '';
        document.getElementById('age').value = profile.age || '';
        document.getElementById('gender').value = profile.gender || '';
        document.getElementById('department').value = profile.department || '';
        document.getElementById('class').value = profile.class || '';
        document.getElementById('section').value = profile.section || '';
        document.getElementById('hobby').value = profile.hobby || '';
        document.getElementById('bio').value = profile.bio || '';

    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile() {
    try {
        const user = await checkAuth();
        if (!user) return;

        const profileData = {
            full_name: document.getElementById('fullNameEdit').value,
            nickname: document.getElementById('nickname').value,
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
            gender: document.getElementById('gender').value,
            department: document.getElementById('department').value,
            class: document.getElementById('class').value,
            section: document.getElementById('section').value,
            hobby: document.getElementById('hobby').value,
            bio: document.getElementById('bio').value
        };

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                ...profileData
            });

        if (error) throw error;

        const successDiv = document.getElementById('profileSuccess');
        successDiv.textContent = 'Profile updated successfully!';
        successDiv.style.display = 'block';

        setTimeout(() => {
            loadProfile();
            document.getElementById('profileView').style.display = 'block';
            document.getElementById('profileEdit').style.display = 'none';
            successDiv.style.display = 'none';
        }, 1500);

    } catch (error) {
        console.error('Error updating profile:', error);
        const errorDiv = document.getElementById('profileError');
        errorDiv.textContent = 'Error updating profile. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// ===== POST FUNCTIONS =====
let uploadedFiles = {
    images: [],
    video: null,
    file: null
};

let editingPostId = null;

function previewFiles(event) {
    const fileType = event.target.id;
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');

    if (fileType === 'imageUpload') {
        uploadedFiles.images = Array.from(files);
    } else if (fileType === 'videoUpload' && files.length > 0) {
        uploadedFiles.video = files[0];
    } else if (fileType === 'fileUpload' && files.length > 0) {
        uploadedFiles.file = files[0];
    }

    preview.innerHTML = '';

    uploadedFiles.images.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${URL.createObjectURL(img)}" alt="Preview">
            <button type="button" class="preview-remove" onclick="removeFile('image', ${index})">×</button>
        `;
        preview.appendChild(div);
    });

    if (uploadedFiles.video) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <video src="${URL.createObjectURL(uploadedFiles.video)}" controls></video>
            <button type="button" class="preview-remove" onclick="removeFile('video')">×</button>
        `;
        preview.appendChild(div);
    }

    if (uploadedFiles.file) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <div style="padding: 10px; background: var(--bg-tertiary); height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; text-align: center; position: absolute; top: 0; left: 0; width: 100%;">
                <i class="fas fa-file" style="font-size: 2rem;"></i>
            </div>
            <button type="button" class="preview-remove" onclick="removeFile('file')">×</button>
        `;
        preview.appendChild(div);
    }
}

function removeFile(type, index) {
    if (type === 'image') {
        uploadedFiles.images.splice(index, 1);
    } else if (type === 'video') {
        uploadedFiles.video = null;
        document.getElementById('videoUpload').value = '';
    } else if (type === 'file') {
        uploadedFiles.file = null;
        document.getElementById('fileUpload').value = '';
    }

    previewFiles({ target: { id: '', files: [] } });
}

async function uploadFile(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

    if (error) {
        console.error('Upload error:', error);
        throw error;
    }

    const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    console.log('Uploaded file URL:', urlData.publicUrl);
    return urlData.publicUrl;
}

async function createPost() {
    try {
        const user = await checkAuth();
        if (!user) return;

        const content = document.getElementById('postContent').value.trim();

        if (!content && uploadedFiles.images.length === 0 && !uploadedFiles.video && !uploadedFiles.file) {
            alert('Please add some content or media to your post');
            return;
        }

        const submitBtn = document.querySelector('#createPostForm button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = editingPostId ? '<i class="fas fa-spinner fa-spin"></i> Updating...' : '<i class="fas fa-spinner fa-spin"></i> Posting...';

        let postData = {
            content: content
        };

        if (uploadedFiles.images.length > 0) {
            const imageUrls = [];
            for (const img of uploadedFiles.images) {
                try {
                    const url = await uploadFile(img, 'images');
                    imageUrls.push(url);
                    console.log('Image uploaded:', url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    throw new Error('Failed to upload image');
                }
            }
            postData.image_urls = imageUrls;
        }

        if (uploadedFiles.video) {
            try {
                const videoUrl = await uploadFile(uploadedFiles.video, 'videos');
                postData.video_url = videoUrl;
                console.log('Video uploaded:', videoUrl);
            } catch (error) {
                console.error('Error uploading video:', error);
                throw new Error('Failed to upload video');
            }
        }

        if (uploadedFiles.file) {
            try {
                const fileUrl = await uploadFile(uploadedFiles.file, 'files');
                postData.file_url = fileUrl;
                postData.file_name = uploadedFiles.file.name;
                console.log('File uploaded:', fileUrl);
            } catch (error) {
                console.error('Error uploading file:', error);
                throw new Error('Failed to upload file');
            }
        }

        console.log('Post data:', postData);

        let data, error;
        if (editingPostId) {
            console.log('Updating post ID:', editingPostId);
            const result = await supabase
                .from('posts')
                .update(postData)
                .eq('id', editingPostId)
                .eq('user_id', user.id)
                .select();
            data = result.data;
            error = result.error;
            
            if (error) {
                console.error('Update error details:', error);
            }
        } else {
            postData.user_id = user.id;
            const result = await supabase
                .from('posts')
                .insert([postData])
                .select();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Error saving post:', error);
            throw error;
        }

        console.log('Post saved successfully:', data);

        document.getElementById('createPostForm').reset();
        document.getElementById('uploadPreview').innerHTML = '';
        uploadedFiles = { images: [], video: null, file: null };
        
        const wasEditing = editingPostId !== null;
        editingPostId = null;

        const createPostSection = document.querySelector('#postSectionTitle');
        createPostSection.innerHTML = '<i class="fas fa-edit"></i> Create a Post';
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.remove();
        }

        await loadPosts();

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';

        alert(wasEditing ? 'Post updated successfully!' : 'Post created successfully!');

    } catch (error) {
        console.error('Error creating/updating post:', error);
        alert('Error: ' + error.message);
        const submitBtn = document.querySelector('#createPostForm button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingPostId ? '<i class="fas fa-edit"></i> Update Post' : '<i class="fas fa-paper-plane"></i> Post';
    }
}

async function editPost(postId) {
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) {
            console.error('Error loading post:', error);
            throw error;
        }

        console.log('Loaded post for editing:', post);

        document.getElementById('postContent').value = post.content || '';
        editingPostId = postId;

        uploadedFiles = { images: [], video: null, file: null };
        document.getElementById('uploadPreview').innerHTML = '';
        document.getElementById('imageUpload').value = '';
        document.getElementById('videoUpload').value = '';
        document.getElementById('fileUpload').value = '';

        const createPostSection = document.querySelector('#postSectionTitle');
        createPostSection.innerHTML = '<i class="fas fa-edit"></i> Edit Post';
        
        const submitBtn = document.querySelector('#createPostForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Post';

        let cancelBtn = document.getElementById('cancelEditBtn');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.className = 'btn-secondary';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            cancelBtn.onclick = cancelEdit;
            submitBtn.parentElement.appendChild(cancelBtn);
        }

        document.querySelector('.create-post-section').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading post for edit:', error);
        alert('Error loading post. Please try again.');
    }
}

function cancelEdit() {
    document.getElementById('createPostForm').reset();
    document.getElementById('uploadPreview').innerHTML = '';
    uploadedFiles = { images: [], video: null, file: null };
    editingPostId = null;

    const createPostSection = document.querySelector('#postSectionTitle');
    createPostSection.innerHTML = '<i class="fas fa-edit"></i> Create a Post';
    
    const submitBtn = document.querySelector('#createPostForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
        return;
    }

    try {
        console.log('Deleting post:', postId);
        
        const user = await checkAuth();
        if (!user) return;
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }

        console.log('Post deleted successfully');
        
        await loadPosts();
        
        alert('Post deleted successfully!');

    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post: ' + error.message);
    }
}

async function loadPosts() {
    try {
        console.log('Starting to load posts...');
        
        const user = await checkAuth();
        if (!user) return;
        
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles (
                    full_name,
                    nickname
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error loading posts:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        console.log('Posts loaded successfully:', posts);
        console.log('Number of posts:', posts ? posts.length : 0);

        const container = document.getElementById('postsContainer');
        
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="loading"><i class="fas fa-inbox"></i><br>No posts yet. Be the first to post!</div>';
            return;
        }

        container.innerHTML = '';

        posts.forEach((post, index) => {
            console.log(`Rendering post ${index + 1}:`, post);
            const postElement = createPostElement(post, user.id);
            container.appendChild(postElement);
        });

        console.log('All posts rendered successfully!');

    } catch (error) {
        console.error('Fatal error loading posts:', error);
        const container = document.getElementById('postsContainer');
        container.innerHTML = `
            <div class="loading" style="color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle"></i><br>
                Error loading posts: ${error.message}<br>
                <small>Check console (F12) for details</small><br>
                <button onclick="loadPosts()" class="btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function createPostElement(post, currentUserId) {
    const div = document.createElement('div');
    div.className = 'post-card';

    const displayName = post.profiles?.nickname || post.profiles?.full_name || 'Anonymous';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const postDate = new Date(post.created_at).toLocaleString();

    let mediaHTML = '';

    if (post.image_urls && Array.isArray(post.image_urls) && post.image_urls.length > 0) {
        console.log('Displaying images:', post.image_urls);
        mediaHTML += '<div class="post-media">';
        post.image_urls.forEach(url => {
            if (url) {
                mediaHTML += `<img src="${url}" alt="Post image" onerror="console.error('Failed to load image:', this.src); this.style.display='none';">`;
            }
        });
        mediaHTML += '</div>';
    }

    if (post.video_url) {
        console.log('Displaying video:', post.video_url);
        mediaHTML += `<div class="post-media">
            <video src="${post.video_url}" controls onerror="console.error('Failed to load video:', this.src); this.style.display='none';"></video>
        </div>`;
    }

    if (post.file_url) {
        console.log('Displaying file:', post.file_url);
        mediaHTML += `
            <div class="post-file">
                <i class="fas fa-file"></i>
                <a href="${post.file_url}" target="_blank" rel="noopener noreferrer">${post.file_name || 'Download file'}</a>
            </div>
        `;
    }

    let actionsHTML = '';
    if (post.user_id === currentUserId) {
        actionsHTML = `
            <div class="post-actions">
                <button class="btn-edit" onclick="editPost('${post.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deletePost('${post.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${initials}</div>
            <div class="post-info">
                <h4>${displayName}</h4>
                <p>${postDate}</p>
            </div>
        </div>
        ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
        ${mediaHTML}
        ${actionsHTML}
    `;

    return div;
}

// Make functions available globally
window.removeFile = removeFile;
window.editPost = editPost;
window.deletePost = deletePost;
window.cancelEdit = cancelEdit;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    
    // Check auth status
    const user = await checkAuth();
    
    if (user) {
        showPage('feed');
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Auth page navigation
    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
    });
    
    document.getElementById('showSignin').addEventListener('click', (e) => {
        e.preventDefault();
        showSignin();
    });
    
    // Sign in form
    document.getElementById('signinForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        const errorDiv = document.getElementById('signinError');
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';

        const signinBtn = document.getElementById('signinBtn');
        signinBtn.disabled = true;
        signinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

        try {
            const result = await signIn(email, password);
            
            if (result.success) {
                document.getElementById('authPage').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                showPage('feed');
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                signinBtn.disabled = false;
                signinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.style.display = 'block';
            signinBtn.disabled = false;
            signinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    });
    
    // Sign up form
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const fullName = document.getElementById('fullName').value;

        const errorDiv = document.getElementById('signupError');
        const successDiv = document.getElementById('signupSuccess');
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        successDiv.textContent = '';
        successDiv.style.display = 'none';

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
            return;
        }

        const signupBtn = document.getElementById('signupBtn');
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

        try {
            const result = await signUp(email, password, fullName);
            
            if (result.success) {
                successDiv.textContent = 'Account created! Please check your email to verify your account.';
                successDiv.style.display = 'block';
                setTimeout(() => {
                    showSignin();
                }, 3000);
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                signupBtn.disabled = false;
                signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.style.display = 'block';
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        }
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Create post form
    document.getElementById('createPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createPost();
    });
    
    // File upload previews
    ['imageUpload', 'videoUpload', 'fileUpload'].forEach(id => {
        document.getElementById(id).addEventListener('change', previewFiles);
    });
    
    // Profile edit
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        document.getElementById('profileView').style.display = 'none';
        document.getElementById('profileEdit').style.display = 'block';
    });
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('profileView').style.display = 'block';
        document.getElementById('profileEdit').style.display = 'none';
    });
    
    // Profile form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
});