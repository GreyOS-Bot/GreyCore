const openHandler =
    require(
        "./ProfileEditOpenHandler"
    );

const submissionHandler =
    require(
        "./ProfileEditSubmissionHandler"
    );

module.exports = {
    ...openHandler,
    ...submissionHandler
};
