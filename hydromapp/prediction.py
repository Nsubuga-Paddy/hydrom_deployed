#FUNCTIONS FOR PROCESSING DATA AND LOADING PPREDICTION MODEL
#Loading the model
def load_model():
    #Loading the model architecture from the JSON file
    with open('pred_model.json','r') as json_file:
        loaded_model_json = json_file.read()
    loaded_model = model_from_json(loaded_model_json)

    #Loading the model weights
    loaded_model.load_weights("pred_model_weights.h5")

    #Compiling the model
    loaded_model.compile(loss='binary_crossentropy',optimizer='adam', metrics=['accuracy'])

    return loaded_model


from numpy import array
# split a multivariate sequence into samples
def split_sequences(sequences, n_steps_in, n_steps_out):
    X, y = list(), list()
    for i in range(len(sequences)):
        # find the end of this pattern
        end_ix = i + n_steps_in
        out_end_ix = end_ix + n_steps_out-1
        # check if we are beyond the dataset
        if out_end_ix >= len(sequences):
            break
        # gather input and output parts of the pattern
        seq_x, seq_y = sequences[i:end_ix, :-1], sequences[end_ix-1:out_end_ix, -1]
        X.append(seq_x)
        y.append(seq_y)
    return np.array(X), np.array(y)


#Preprocessing function to return numpy array sequences data.
def preprocess_data(data):
    # Extracting the relevant features (Note: We don't have dispatch and discharge. We shall be predicting water level )
    features = ['precipitation', 'humidity', 'temperature', 'waterlevel']
    df = pd.DataFrame(data.values_list(*features), columns=features)

    #separating variable
    df_input = df.iloc[:,:-1]
    df_target = df.iloc[:,-1]

    #converting the variables into numpy arrays
    df_input = df_input.to_numpy()
    df_target = df_target.to_numpy()

    #converting the output values into 2D format
    df_target = df_target[:,np.newaxis]

    #Normalising the input and output variables using the MinMaxScaler
    scaler = MinMaxScaler()
    df_input_scaled = scaler.fit_transform(df_input)
    df_target_scaled = scaler.fit_transform(df_target)

    #combining the input and output variables
    df_scaled = np.hstack((df_input_scaled,df_target_scaled))

    #choosing time step period
    n_steps_in, n_steps_out = 24, 5
    X, y = split_sequences(df_scaled, n_steps_in, n_steps_out)
   
    return X, y

#Function that makes the predictions
def make_predicitions_and_store(data, dam_id):
    #Selecting the dam
    dam = get_object_or_404(Dam, pk=dam_id)
    #Loading the model
    model = load_model()
    X,y = preprocess_data(data)
    #Making predictions
    predictions = model.predict(X)

    timestamps = pd.date_range(start=pd.to_datetime('now'), periods=len(predictions), freq='H')

    for i, prediction in enumerate(predictions):
        for value in prediction:
            Prediction.objects.create(
                dam=dam,
                timestamp=timestamps[i],
                waterlevel_prediction=round(value, 2)
            )

