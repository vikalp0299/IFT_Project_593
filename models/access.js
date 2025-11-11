import mongoose from "mongoose";

const accessSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    channelName:{
        type: String,
        required: true
    },
    access:{
        type: String,
        enum: ['allow', 'pending', 'deny'],
        required: true
    }
})
const Access = mongoose.model("Access", accessSchema);
export default Access;