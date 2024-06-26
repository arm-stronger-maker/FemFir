const User = require('../models/userSchema');
const  Category  = require('../models/categorySchema');
const Product = require('../models/productSchema');
const userHelper = require('../helpers/user_helper');
const argon2 = require('argon2');
const bcrypt = require('bcrypt');

let otp;
let userotp;
let usermail;
let hashedPassword;
let userRegesterData;
let userData;


// home page
const getHome = async (req, res) => {
    try {
        if(req.session.user){
            res.render('user/index')
        }
        else{
            res.redirect('/login');
        }
        
    } catch (error) {
        console.log(error.message);
    }
};

//render login page
const showloginPage = async (req, res) => {
    try {
        if(!req.session.user){
            res.render('user/login');
        }else{
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
    }
};

const doLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email }).lean();

        if (!userData) {
            return res.redirect('/login');  // User not found
        }

        if (userData.is_blocked) {
            return res.redirect('/login');  // User is blocked
        }

        const passwordValid = await argon2.verify(userData.password, password);
        
        if (passwordValid) {
            req.session.LoggedIn = true;
            req.session.user = userData;
            return res.redirect('/');
        } else {
            return res.redirect('/login');  // Invalid password
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send('Internal Server Error');
    }
};


const doLogout = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log('Logout error:', err);
                return res.redirect('/');
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/');
    }
};

// render signup page
const showsignupPage = async (req, res) => {
    try {
        if(!req.session.user){
            res.render('user/signup');
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error);
    }
};

// user signup
const dosignup = async (req, res) => {
    try {
        let msg = 'User already exists';
        hashedPassword = await userHelper.hashpassword(req.body.password);
        usermail = req.body.email;
        userRegesterData = req.body;

        const userExist = await User.findOne({ email: usermail }).lean();
        if (!userExist) {
            otp = await userHelper.verifyEmail(usermail);
            res.render('user/otp');
        } else {
            res.render('user/login', { msg });
        }
    } catch (error) {
        console.log(error);
    }
};


// get otp page
const getotppage = async (req, res) => {
    try {
        if(!req.session.user){
            res.render('user/otp');
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error);
    }
};


// verify otp
const submitotp = async (req, res) => {
    try {
        userotp = req.body.otp;
        if (userotp == otp) {
            const user = new User({
                firstname: userRegesterData.firstname,
                lastname: userRegesterData.lastname,
                mobile: userRegesterData.mobileNumber,
                email: userRegesterData.email,
                password: hashedPassword,
                isVerified: true,
                is_blocked: false,
                isAdmin: false
            });

            await user.save();
            res.redirect('/login');
        } else {
            otpErr = 'incorrect otp';
            res.render('user/otp', { otpErr });
        }
    } catch (error) {
        console.log(error);
    }
};

// resend otp
const resendOtp = async (req, res) => {
    try {
        console.log('Resending OTP..');
        res.redirect('/get_otp');
        otp = await userHelper.verifyEmail(usermail);
    } catch (error) {
        console.log(error);
    }
};

const getAdditionalInfoPage = async(req,res)=>{
    res.render('user/additionalinfo', {title: 'Additional Information'})
}


//during google authentication, we want additional informations
const saveAdditionalInfo = async(req,res)=>{
    try{
            const {mobile,password, password2} = req.body;
            if(password !== password2){
                return res.render('user/additionalinfo', {error_msg: 'Password do not match'})
            }
            const user = await User.findById(req.session.user._id);
            if(!user){
                return res.render('user/additionalinfo', {error_msg: 'User not found'})
            }
            if(password){
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword
            }
            user.mobile = mobile;
            await user.save()

            req.session.user = user;
            res.redirect('/');
    }
    catch(error){
            console.log(error.message)
            res.status(500).send('An error occured while saving additional information')
    }
}
 

// const getProducts = async (req, res) => {
//     try {
//         const perPage = 9;
//         const page = parseInt(req.query.page) || 1;
//         const sortOption = req.query.sort || 'default';
//         const searchQuery = req.query.search || '';
//         const categoryFilter = req.query.category || '';

//         let sortCondition;
//         switch (sortOption) {
//             case 'price_high':
//                 sortCondition = { price: -1 };
//                 break;
//             case 'price_low':
//                 sortCondition = { price: 1 };
//                 break;
//             case 'name_asc':
//                 sortCondition = { name: 1 };
//                 break;
//             case 'name_desc':
//                 sortCondition = { name: -1 };
//                 break;
//             case 'new_arrivals':
//                 sortCondition = { createdAt: -1 };  
//                 break;
//             default:
//                 sortCondition = {};
//         }

//         const listedCategories = await Category.find({ status: 'listed' }).select('_id name');
//         const listedCategoryIds = listedCategories.map(category => category._id);

//         let query = {
//             status: 'listed',
//             category: { $in: listedCategoryIds }
//         };

//         if (categoryFilter) {
//             query.category = categoryFilter;
//         }

//         if (searchQuery) {
//             query.name = { $regex: searchQuery, $options: 'i' };
//         }

//         const products = await Product.find(query)
//             .sort(sortCondition)
//             .skip((perPage * page) - perPage)
//             .limit(perPage);

//         const count = await Product.countDocuments(query);

//         res.render('user/product', {
//             products,
//             current: page,
//             pages: Math.ceil(count / perPage),
//             sortOption, 
//             query: req.query,
//             categories: listedCategories
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Something went wrong');
//     }
// };

const getProducts = async (req, res) => {
    try {
        const perPage = 9;
        const page = parseInt(req.query.page) || 1;
        const sortOption = req.query.sort || 'default';
        const searchQuery = req.query.search || '';
        const categoryFilter = req.query.category || '';

        let sortCondition;
        switch (sortOption) {
            case 'price_high':
                sortCondition = { price: -1 };
                break;
            case 'price_low':
                sortCondition = { price: 1 };
                break;
            case 'name_asc':
                sortCondition = { name: 1 };
                break;
            case 'name_desc':
                sortCondition = { name: -1 };
                break;
            case 'new_arrivals':
                sortCondition = { createdAt: -1 };
                break;
            default:
                sortCondition = {};
        }

        const listedCategories = await Category.find({ status: 'listed' }).select('_id name');
        const listedCategoryIds = listedCategories.map(category => category._id);

        let query = {
            status: 'listed',
            category: { $in: listedCategoryIds }
        };

        if (categoryFilter) {
            query.category = categoryFilter;
        }

        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' };
        }

        const products = await Product.find(query)
            .sort(sortCondition)
            .skip((perPage * page) - perPage)
            .limit(perPage);

        const count = await Product.countDocuments(query);

        res.render('user/product', {
            products,
            current: page,
            pages: Math.ceil(count / perPage),
            sortOption,
            query: req.query,
            categories: listedCategories
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
};



const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category').lean();

        if (!product) {
            return res.status(404).send('Product not found');
        }

        let relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id }
        }).limit(3).lean();

        if (relatedProducts.length === 0) {
            relatedProducts = await Product.find({ _id: { $ne: product._id } }).limit(3).lean();
        }

        res.render('user/view', {
            title: product.name,
            product,
            relatedProducts
        });

    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {
    showloginPage,
    showsignupPage,
    getotppage,
    dosignup,
    submitotp,
    doLogin,
    doLogout,
    getHome,
    resendOtp,
    getAdditionalInfoPage,
    saveAdditionalInfo,
    getProducts,
    getProductDetails
};
